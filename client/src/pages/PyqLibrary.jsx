import React from 'react';
import SideNavBar from '../components/SideNavBar.jsx';

export default function PyqLibrary() {
  return (
    <div className="page-export page-pyq-library bg-background text-on-background antialiased overflow-x-hidden">
      {/* Sidebar Navigation */}
      <SideNavBar />
      {/* Main Content Area */}
      <main className="md:ml-72 min-h-screen">
        {/* Top Navbar */}
        <header className="fixed top-0 right-0 left-0 md:left-72 z-30 bg-white/80 backdrop-blur-md px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-stone-900">PYQ Library</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">search</span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary-container" placeholder="Search questions..." type="text" />
            </div>
            <button className="material-symbols-outlined text-stone-500 hover:bg-stone-100 p-2 rounded-full transition-colors">notifications</button>
            <button className="material-symbols-outlined text-stone-500 hover:bg-stone-100 p-2 rounded-full transition-colors">settings</button>
            <div className="w-8 h-8 rounded-full bg-primary-container overflow-hidden">
              <img alt="User profile avatar" className="w-full h-full object-cover" data-alt="professional headshot of a student smiling, clean studio background, soft lighting, modern portrait style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYvBV4EXnmxmjux6LG1DVZ2HlamkV08A57qR8PCMin71EgKnciDUebAouQVui0vTK_zaz-s0kXCN7qryOZseVJvDkfIcGMHGKOwgrBzfqxoBBVPKhScEouMKxKCJqGsKPPysbu1ofd6KFNAyh_PVk3bzJf81PBd0bXsJcGOxEN1CsqM7U1WrbfPlYA71sCwjkEdwe9vv1DBkIJO6dKx-Un9norQHJeSaPhc6ntG80V0UgZw6Fa5njWs-6SjW8KWSlqXANa9m910wY" />
            </div>
          </div>
        </header>
        {/* Page Canvas */}
        <div className="pt-24 pb-12 px-8">
          {/* Bento Layout Container */}
          <div className="grid grid-cols-12 gap-8">
            {/* Filter Section (Asymmetric Side) */}
            <aside className="col-span-12 lg:col-span-3 space-y-8">
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_24px_48px_rgba(14,14,14,0.06)]">
                <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">filter_list</span>
                  Company Focus
                </h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-full bg-primary-container text-on-primary-container font-bold text-sm">
                    <span>Google</span>
                    <span className="bg-on-primary-container/20 px-2 py-0.5 rounded-full text-[10px]">142</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-full hover:bg-surface-container-low text-on-surface font-medium text-sm transition-colors">
                    <span>Infosys</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px]">2,410</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-full hover:bg-surface-container-low text-on-surface font-medium text-sm transition-colors">
                    <span>TCS</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px]">1,890</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-full hover:bg-surface-container-low text-on-surface font-medium text-sm transition-colors">
                    <span>Microsoft</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px]">86</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-full hover:bg-surface-container-low text-on-surface font-medium text-sm transition-colors">
                    <span>Amazon</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px]">312</span>
                  </button>
                </div>
                <hr className="my-6 border-outline-variant/20" />
                <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-stone-400 mb-6">Topic Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-xs font-bold">Algorithms</span>
                  <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-full text-xs font-bold">System Design</span>
                  <span className="px-3 py-1 bg-surface-container-high text-on-surface rounded-full text-xs font-bold">DBMS</span>
                  <span className="px-3 py-1 bg-surface-container-high text-on-surface rounded-full text-xs font-bold">OS</span>
                  <span className="px-3 py-1 bg-surface-container-high text-on-surface rounded-full text-xs font-bold">Recursion</span>
                </div>
              </div>
              {/* Resource Spotlight Card */}
              <div className="relative overflow-hidden bg-inverse-surface rounded-xl p-8 text-white h-64 flex flex-col justify-end group cursor-pointer">
                <div className="absolute inset-0 opacity-40 group-hover:scale-110 transition-transform duration-700">
                  <img alt="Resource spotlight" className="w-full h-full object-cover" data-alt="abstract tech pattern with glowing orange lines on dark charcoal background, cinematic depth of field, high-end tech aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3Se46wdAWCD1dva4aUQdyE179GPXXVDwtDvZZRv6FxAQBqbNioIcjOzrhH8fIpARKKSiH9vpH_uf8ujqwKPcDx_a1etLa-45dqbqlaprKX6Z1uxYy4yWBtuPXNzoNvLTB_PSqFmNLQtqPWa8jrU0EMTZ5nw0pYb5tnqTmu2b44prnB8UwT8cCnJIAk3QBP0dSYYvooK3u3BZ0pl48F6j3uGTwwXbhtFPlGUeoCZMRLxd3pYXntX2oyhAxxjQZh8mGdDpzqmOnbhM" />
                </div>
                <div className="relative z-10">
                  <span className="text-xs font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded mb-2 inline-block">PREMIUM GUIDE</span>
                  <h4 className="text-xl font-bold leading-tight">Mastering Google Interviews: 2024 Edition</h4>
                </div>
              </div>
            </aside>
            {/* Question List (Main Content) */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {/* Featured Promo Card (Top Bento) */}
              <div className="bg-tertiary-container/30 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 border border-tertiary-container/20">
                <div className="flex-1">
                  <h2 className="text-3xl font-headline font-extrabold text-on-tertiary-container mb-2">Practice makes permanent.</h2>
                  <p className="text-on-tertiary-container/80 text-lg">We've compiled over 5,000+ questions from the last 10 years of placement history across 50 top-tier tech firms.</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-black text-on-tertiary-container">84%</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-on-tertiary-container/60">Success Rate</div>
                </div>
              </div>
              {/* Questions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Question Card 1 */}
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                          <img alt="Google logo" className="w-6 h-6" data-alt="minimalist tech company logo on white background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnmCDNSSlI8ZqufKU5N23IdW9l1U2QL71pCqq1ej-R_H6WP9BOF9Rxn6j2gVbYaUq8wAOD9TmnIzjJC1C990KfA8D4-eQXTEPvP7BMtIeCcRXxlqE22wNLu5c1ncXziqdMm9iiRPgYsyWZypI9sbaYpd4Pu5PCusYXQWd_lSbVDIoOrN6dRbrqeXYW4iygngqoRbZDn4ZixtzBhuoPDoWlYNTroKz9thauXn301ao4cxebpx2wEdBqy3wFq3n0r_SKQwojT92qhf4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Google • 2023</p>
                          <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">LRU Cache Implementation</h3>
                        </div>
                      </div>
                      <button className="material-symbols-outlined text-stone-300 hover:text-primary transition-colors">bookmark</button>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      Design and implement a data structure for Least Recently Used (LRU) cache. It should support get and put operations in O(1) time complexity.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Data Structures</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Medium</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-full text-sm font-bold active:scale-95 transition-transform">Solve Now</button>
                    <button className="px-4 bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-bold active:scale-95 transition-transform flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: '"FILL" 1'}}>check_circle</span>
                    </button>
                  </div>
                </div>
                {/* Question Card 2 */}
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group border-l-4 border-secondary-fixed">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                          <img alt="Infosys logo" className="w-6 h-6" data-alt="company corporate logo on white background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqecWkvSufN_ubMSvxLQLHmiLGoBVmloXE5P4yuVaAXA9Ypc5ojfnKcVvw8IBfCgcgu-pMLb3wfq5hdVY7rUg0vsmEmWkPm3IPneAyJS4xakJXkhUoG1ZvOyK0tDBd8WQMoxG9UhQFxKLpyivR1nMPJtqi3Ap0QfglwJeRynapb-ZgiLc4Ec2T_XtC9pZBcushawca6pr_eJb8iWFjVfX3F1eV1we02cS_2Ropn8gd8nWVVTiefWMFcYYAWSFRC9wpgqefjnGMcrs" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Infosys • 2022</p>
                          <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">Two Sum Optimization</h3>
                        </div>
                      </div>
                      <button className="material-symbols-outlined text-stone-300 hover:text-primary transition-colors">bookmark</button>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      Given an array of integers, return indices of the two numbers such that they add up to a specific target.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Arrays</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Easy</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-full text-sm font-bold active:scale-95 transition-transform">Solve Now</button>
                    <button className="px-4 bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-bold active:scale-95 transition-transform flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                  </div>
                </div>
                {/* Question Card 3 */}
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                          <img alt="Amazon logo" className="w-6 h-6" data-alt="major e-commerce brand logo on white background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCd20B-EXdMfbJQIpCEdxhmqczt4NGESdgusK8MlQ-2wJUJK_AfOKRVq_MH9glEUjFpdz-4Y0RyfrI0AmbVW0GaZyQC2VPeXa0unMk4eP3WIfmLpASApAhrJyPxQe__F5pECWZpaZhayv0Tc3yhMWSaE5uEf5XdXzmAGSK-UZhOsAmsBqLJkjc8Yh9VM88uk5sHY4QG0L5u3GR3nca5CaUOMJ6YdISC3yvHCG7pSiYNuAeGSSMv2kNf20Ckbl81xCtob1T0_CyblUc" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Amazon • 2024</p>
                          <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">Max Area of Island</h3>
                        </div>
                      </div>
                      <button className="material-symbols-outlined text-stone-300 hover:text-primary transition-colors">bookmark</button>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      You are given an m x n binary matrix grid. An island is a group of 1's (representing land) connected 4-directionally.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">DFS/BFS</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Hard</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-full text-sm font-bold active:scale-95 transition-transform">Solve Now</button>
                    <button className="px-4 bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-bold active:scale-95 transition-transform flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                  </div>
                </div>
                {/* Question Card 4 */}
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                          <img alt="Microsoft logo" className="w-6 h-6" data-alt="tech conglomerate logo on white background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcd0tyCN5mWhTPfUs5UwtASi048EbUGqZ_Pe2x8bDPFXHHp5RiiETGQ_Rq4LwW_K77X579gnqdD9k7Gat_3Z3jBaDjDjZ_v-hxMvPMAxwSXTxixOlRSHdtzXgMxKTX2bDrQyGl-R-TASjquFpSlN5kK7IbbK1yJEuLvsg9dNHRqdEO5iGwLr2wKXeLis5dFxZ8Z2QV5QnZdFQdGs8vzhfevJcLcs9Cxchh668OOdoT2vUfcIhbI9peMCqdpJpRUXzvlaQOsGE15EE" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Microsoft • 2021</p>
                          <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">Rotate Image</h3>
                        </div>
                      </div>
                      <button className="material-symbols-outlined text-stone-300 hover:text-primary transition-colors" style={{fontVariationSettings: '"FILL" 1'}}>bookmark</button>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                      You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise) in-place.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Matrix</span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium rounded">Medium</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-container text-on-primary-container py-3 rounded-full text-sm font-bold active:scale-95 transition-transform">Solve Now</button>
                    <button className="px-4 bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-bold active:scale-95 transition-transform flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                  </div>
                </div>
              </div>
              {/* Load More Button */}
              <div className="flex justify-center pt-8">
                <button className="px-8 py-3 bg-white text-on-surface font-bold rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-outline-variant/10">
                  Load More Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex justify-around items-center h-16 z-50 px-4">
        <a className="flex flex-col items-center text-stone-400" href="/dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-medium">Home</span>
        </a>
        <a className="flex flex-col items-center text-stone-400" href="#">
          <span className="material-symbols-outlined">quiz</span>
          <span className="text-[10px] font-medium">Tests</span>
        </a>
        <a className="flex flex-col items-center text-orange-600" href="/pyq-library">
          <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>history_edu</span>
          <span className="text-[10px] font-bold">PYQs</span>
        </a>
        <a className="flex flex-col items-center text-stone-400" href="#">
          <span className="material-symbols-outlined">psychology</span>
          <span className="text-[10px] font-medium">AI Coach</span>
        </a>
        <a className="flex flex-col items-center text-stone-400" href="/profile">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-medium">Profile</span>
        </a>
      </nav>
    </div>
    
  );
}
