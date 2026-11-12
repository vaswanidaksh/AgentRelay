import { useState } from 'react';
import { createTeam } from '../lib/api';

export default function CreateTeamModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCli, setCopiedCli] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a team workspace name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newTeam = await createTeam(cleanName);
      if (onCreated) onCreated(newTeam);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to create team workspace.'
      );
    } finally {
      setLoading(false);
    }
  };

  const cliCommand = `agentrelay team create "${name.trim() || 'Engineering Team'}"`;

  const copyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#141414] p-6 shadow-2xl space-y-4 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
              +
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Create Team Workspace</h3>
              <p className="text-[11px] text-white/50">Establish a new isolated context repository</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-sm p-1 rounded-lg hover:bg-white/[0.06] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 block">
              Workspace Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Core Engineering"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] focus:border-emerald-400/50 text-xs text-white placeholder-white/25 outline-hidden transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? 'Creating…' : 'Create Workspace'}
            </button>
          </div>
        </form>

        {/* CLI Alternative helper */}
        <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>Terminal CLI Alternative:</span>
            <button
              onClick={copyCli}
              className="text-emerald-400 hover:text-emerald-300 font-mono text-[10px] cursor-pointer"
            >
              {copiedCli ? 'Copied ✓' : 'Copy Command'}
            </button>
          </div>
          <code className="block p-2 rounded-lg bg-black/60 border border-white/[0.06] text-[11px] font-mono text-emerald-400 select-all break-all overflow-x-auto">
            $ {cliCommand}
          </code>
        </div>
      </div>
    </div>
  );
}

