/**
 * Leaderboard Component
 * Requirements: 14.1, 14.3, 14.4, 14.5
 * - Top 100 scores display
 * - Weekly/All Time tabs
 * - Player rank highlight
 */

import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Clock, Medal, Crown, Award } from 'lucide-react';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  getTopScores,
  addScore,
  isQualifyingScore,
} from '../../systems/leaderboard';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore?: number;
  playerName?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  isOpen,
  onClose,
  currentScore,
  playerName,
}) => {
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('allTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitName, setSubmitName] = useState(playerName || '');
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);

  // Load entries when period changes or modal opens
  useEffect(() => {
    if (isOpen) {
      loadEntries();
    }
  }, [isOpen, activePeriod]);

  // Check if current score qualifies
  useEffect(() => {
    if (isOpen && currentScore !== undefined && currentScore > 0) {
      setShowSubmitForm(isQualifyingScore(currentScore));
    }
  }, [isOpen, currentScore]);

  const loadEntries = () => {
    const topScores = getTopScores(activePeriod);
    setEntries(topScores);
  };

  const handleSubmitScore = () => {
    if (!submitName.trim() || currentScore === undefined) return;

    const entry = addScore(submitName.trim(), currentScore);
    if (entry) {
      setSubmittedEntryId(entry.id);
      setShowSubmitForm(false);
      loadEntries();
    }
  };

  const periods: { id: LeaderboardPeriod; label: string; icon: React.ReactNode }[] = [
    { id: 'weekly', label: 'Haftalık', icon: <Calendar className="w-4 h-4" /> },
    { id: 'allTime', label: 'Tüm Zamanlar', icon: <Clock className="w-4 h-4" /> },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-400/10 border-gray-400/30';
      case 3:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 max-h-[85vh] bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white tracking-wider">SIRALAMA</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Period Tabs */}
        <div className="flex border-b border-white/10">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setActivePeriod(period.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activePeriod === period.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {period.icon}
              {period.label}
            </button>
          ))}
        </div>

        {/* Score Submit Form */}
        {showSubmitForm && currentScore !== undefined && (
          <div className="p-4 bg-cyan-500/10 border-b border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-2">
              Skorun sıralamaya girmeye hak kazandı!
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={submitName}
                onChange={(e) => setSubmitName(e.target.value)}
                placeholder="İsminizi girin..."
                maxLength={20}
                className="flex-1 px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSubmitScore}
                disabled={!submitName.trim()}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  submitName.trim()
                    ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Gönder
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-180px)]">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Henüz skor yok</p>
              <p className="text-sm text-white/30 mt-1">
                İlk skoru sen kaydet!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isHighlighted = entry.id === submittedEntryId;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isHighlighted
                        ? 'bg-cyan-500/20 border-cyan-500/50 ring-1 ring-cyan-500/30'
                        : getRankStyle(rank)
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-10 flex items-center justify-center">
                      {getRankIcon(rank) || (
                        <span className={`text-lg font-bold ${
                          rank <= 10 ? 'text-white' : 'text-white/50'
                        }`}>
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        isHighlighted ? 'text-cyan-400' : 'text-white'
                      }`}>
                        {entry.playerName}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDate(entry.submissionDate)}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        rank === 1
                          ? 'text-yellow-400'
                          : rank === 2
                          ? 'text-gray-300'
                          : rank === 3
                          ? 'text-amber-600'
                          : isHighlighted
                          ? 'text-cyan-400'
                          : 'text-white'
                      }`}>
                        {entry.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
