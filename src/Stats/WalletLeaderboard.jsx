// src/Stats/WalletLeaderboard.jsx
import React, { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { Trophy, Medal, ShieldCheck, Timer, Hash } from 'lucide-react'
import { DEAD_DROP_REGISTRY_ADDRESS } from '../monad/deadDropRegistry'
import { monadTestnet } from '../../waqmi.config'

// Helper to truncate addresses like 0x1234...abcd
const shortAddr = (addr) =>
  addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''

const WalletLeaderboard = () => {
  const publicClient = usePublicClient({ chainId: monadTestnet.id })

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)

      if (!publicClient) {
        setLoading(false)
        return
      }

      try {
        // Fetch all MysterySolved events
        const logs = await publicClient.getLogs({
          address: DEAD_DROP_REGISTRY_ADDRESS,
          event: {
            type: 'event',
            name: 'MysterySolved',
            inputs: [
              { indexed: true, name: 'mysteryId', type: 'uint256' },
              { indexed: true, name: 'solver', type: 'address' },
              { indexed: false, name: 'solveTime', type: 'uint256' }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        })

        // Aggregate by wallet address
        const byWallet = new Map()

        logs.forEach((log) => {
          const solver = log.args.solver
          const solveTime = Number(log.args.solveTime)

          if (!byWallet.has(solver)) {
            byWallet.set(solver, {
              wallet_address: solver,
              total_solves: 0,
              fastest_time: solveTime,
              total_time: 0
            })
          }

          const entry = byWallet.get(solver)
          entry.total_solves += 1
          entry.total_time += solveTime

          if (solveTime < entry.fastest_time) {
            entry.fastest_time = solveTime
          }
        })

        // Convert to array and sort by fastest time, then by total solves
        const leaderboard = Array.from(byWallet.values())
          .sort((a, b) => {
            if (a.fastest_time !== b.fastest_time) {
              return a.fastest_time - b.fastest_time
            }
            return b.total_solves - a.total_solves
          })

        setRows(leaderboard)
      } catch (error) {
        console.error('Error fetching leaderboard from chain:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [publicClient])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Medal icons for top 3
  const getMedalIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-400" />
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-300" />
    if (rank === 2) return <Medal className="w-5 h-5 text-amber-600" />
    return <ShieldCheck className="w-4 h-4 text-slate-600" />
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">Loading leaderboard from blockchain...</p>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-purple-400" />
          Global Leaderboard
        </h2>
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400">No mysteries solved yet. Be the first!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Trophy className="w-6 h-6 text-purple-400" />
        Global Leaderboard
      </h2>

      <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Wallet
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Timer className="w-3 h-3" />
                  Fastest
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Hash className="w-3 h-3" />
                  Solves
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row, idx) => (
              <tr
                key={row.wallet_address}
                className={`hover:bg-slate-800/30 transition-colors ${
                  idx < 3 ? 'bg-slate-800/20' : ''
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getMedalIcon(idx)}
                    <span className="text-slate-300 font-bold">#{idx + 1}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-mono text-purple-300">
                    {shortAddr(row.wallet_address)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className="text-sm font-bold text-green-400">
                    {formatTime(row.fastest_time)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className="text-sm text-slate-300">
                    {row.total_solves}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WalletLeaderboard