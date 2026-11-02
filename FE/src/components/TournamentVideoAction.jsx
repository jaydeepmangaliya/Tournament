import React, { useState } from 'react';

const TOURNAMENT_VIDEOS = [
  {
    id: 'ffws-finals',
    game: 'Free Fire',
    badge: 'FFWS GRAND FINALS',
    title: 'Free Fire World Series (FFWS) - Grand Finals Championship Highlights',
    desc: 'Watch top tier professional Free Fire squads battle through the final circle in Bermuda with high-frag clutch gameplay.',
    youtubeId: 'MbmNya451yM',
    spectators: '24,850',
    tags: ['48-Player BR', 'Bermuda', 'Championship Match'],
  },
  {
    id: 'ff-clash-squad',
    game: 'Free Fire',
    badge: '4V4 CLASH CLUTCH',
    title: 'Free Fire 4v4 Clash Squad - Grand Finals Round 7 Decider',
    desc: 'High-speed close-quarters shotgun combat, quick-gloo wall placements, and 1v3 ace clutch moments.',
    youtubeId: 'Scw5gk36Yz4',
    spectators: '16,210',
    tags: ['4v4 Clash Squad', 'Ace Clutch', 'Factory Decider'],
  },
  {
    id: 'bgmi-finals',
    game: 'PUBG Mobile',
    badge: 'BGIS GRAND FINALS',
    title: 'BGIS Championship - Official Grand Finals Match Highlights',
    desc: 'Intense Erangel bridge camps, tactical sniper squad wipes, and final zone rotational dominance.',
    youtubeId: 'vvjsxLSCfoU',
    spectators: '31,400',
    tags: ['Erangel Classic', 'Chicken Dinner', 'Pro Invitational'],
  },
];

export default function TournamentVideoAction() {
  const [selectedVideo, setSelectedVideo] = useState(TOURNAMENT_VIDEOS[0]);

  return (
    <section className="py-16 sm:py-24 px-3 sm:px-6 lg:px-8 bg-[#050507] border-b border-zinc-900 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[650px] h-[350px] bg-gradient-to-b from-white/5 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Tournament Action Showcase</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">
            Live Esports <span className="text-silver">In Action</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Witness the intense firefights, high-frag clutches, and tournament deciders in Free Fire and PUBG Mobile.
          </p>

          {/* Video Switcher Tabs */}
          <div className="pt-3 flex justify-center">
            <div className="flex flex-wrap justify-center gap-1.5 p-1 bg-[#0e0e13] border border-zinc-800 rounded-2xl max-w-2xl w-full">
              {TOURNAMENT_VIDEOS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVideo(v)}
                  className={`flex-1 min-w-[140px] py-2 sm:py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition text-center ${
                    selectedVideo.id === v.id
                      ? 'bg-zinc-200 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {v.badge}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video Player Display Container */}
        <div className="bg-[#0b0b0f] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Broadcast Top Bar */}
          <div className="px-4 sm:px-6 py-3 bg-[#111117] border-b border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-700 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                <span>MATCH REEL</span>
              </span>
              <span className="font-bold text-white text-xs truncate max-w-[200px] sm:max-w-md">
                {selectedVideo.title}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-zinc-400 font-mono text-[11px]">
              <svg className="w-3.5 h-3.5 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{selectedVideo.spectators} Spectators</span>
            </div>
          </div>

          {/* 16:9 Video Embed */}
          <div className="relative w-full aspect-video bg-black">
            <iframe
              key={selectedVideo.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${selectedVideo.youtubeId}&playsinline=1&rel=0&modestbranding=1`}
              title={selectedVideo.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Video Footer Info */}
          <div className="p-4 sm:p-6 bg-[#0e0e14] border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-white text-base sm:text-lg">{selectedVideo.title}</h3>
              <p className="text-xs text-zinc-400 max-w-2xl">{selectedVideo.desc}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
              {selectedVideo.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-300 font-bold uppercase"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

