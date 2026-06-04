'use client'
import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'

export type TxStep =
  | 'idle'
  | 'awaiting_approval'
  | 'approval_pending'
  | 'awaiting_confirm'
  | 'tx_pending'
  | 'success'
  | 'error'

export interface TxState {
  step: TxStep
  txHash: `0x${string}` | null
  error: string | null
}

export interface TxActions {
  setStep: (step: TxStep) => void
  setHash: (hash: `0x${string}`) => void
  setError: (msg: string) => void
  reset: () => void
  /** Full pipeline: run fn(), handle receipt check, set states */
  run: (fn: () => Promise<`0x${string}`>, opts?: { needsApproval?: boolean }) => Promise<void>
}

const INITIAL: TxState = { step: 'idle', txHash: null, error: null }

/** Parses a wagmi/viem error into a human-readable string. */
function parseError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; code?: number; name?: string }
  // User rejected
  if (err.code === 4001 || err.name === 'UserRejectedRequestError' || err.message?.includes('User rejected')) {
    return 'Transaction cancelled'
  }
  // Revert — extract reason
  if (err.message?.includes('reverted')) {
    const match = err.message.match(/reverted with reason string '(.+?)'/) ||
                  err.message.match(/reverted: (.+?)(?:\n|$)/)
    if (match) return match[1]
    return 'Transaction reverted on-chain'
  }
  // Network
  if (err.message?.includes('network') || err.message?.includes('fetch')) {
    return 'Connection issue — try again'
  }
  if (err.shortMessage) return err.shortMessage.slice(0, 120)
  if (err.message)      return err.message.slice(0, 120)
  return 'Transaction failed'
}

export function useTransactionState(): [TxState, TxActions] {
  const [state, setState] = useState<TxState>(INITIAL)
  const client = usePublicClient({ chainId: 1301 })

  const setStep  = useCallback((step: TxStep)              => setState(s => ({ ...s, step })), [])
  const setHash  = useCallback((txHash: `0x${string}`)     => setState(s => ({ ...s, txHash })), [])
  const setError = useCallback((error: string)             => setState({ step: 'error', txHash: null, error }), [])
  const reset    = useCallback(()                          => setState(INITIAL), [])

  const run = useCallback(async (
    fn: () => Promise<`0x${string}`>,
    opts?: { needsApproval?: boolean },
  ) => {
    try {
      if (opts?.needsApproval) {
        setState({ step: 'awaiting_approval', txHash: null, error: null })
      } else {
        setState({ step: 'awaiting_confirm', txHash: null, error: null })
      }
      const hash = await fn()
      setState({ step: 'tx_pending', txHash: hash, error: null })
      const receipt = await client?.waitForTransactionReceipt({ hash })
      if (receipt?.status === 'reverted') throw new Error('Transaction reverted on-chain')
      setState({ step: 'success', txHash: hash, error: null })
    } catch (e) {
      setState({ step: 'error', txHash: null, error: parseError(e) })
    }
  }, [client])

  const actions: TxActions = { setStep, setHash, setError, reset, run }
  return [state, actions]
}
