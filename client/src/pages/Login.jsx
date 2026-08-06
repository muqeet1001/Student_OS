import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate('/dashboard');
  }

  return (
    <div className="page-export page-login bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen flex items-center justify-center">
      <div className="flex w-full min-h-screen overflow-hidden">
        {/* Left Side: Bento Content (Suppressed Nav Shell as per instructions for Transactional pages) */}
        <section className="hidden lg:flex lg:w-1/2 p-12 bg-inverse-surface relative overflow-hidden flex-col justify-between">
          <div className="z-10">
            <div className="flex items-center gap-2 mb-12">
              <span className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
                <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>rocket_launch</span>
              </span>
              <span className="text-2xl font-black tracking-tighter text-white font-headline">Student OS</span>
            </div>
            <div className="max-w-md">
              <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
                The Structured <span className="text-primary-container">Playground</span> for Careers.
              </h1>
              <p className="text-inverse-on-surface text-lg leading-relaxed">
                Master technical skills, build an editorial-grade resume, and ace AI-powered interviews in one unified ecosystem.
              </p>
            </div>
          </div>
          {/* Bento Decorative Elements */}
          <div className="bento-grid h-1/2 mt-12 relative z-10">
            {/* Skill Track Card */}
            <div className="col-span-2 row-span-2 bg-tertiary-fixed rounded-xl p-6 flex flex-col justify-between transform rotate-2">
              <div className="flex justify-between items-start">
                <span className="material-symbols-outlined text-on-tertiary-fixed text-4xl">psychology</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-on-tertiary-fixed tracking-widest uppercase">SOFT SKILLS</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-on-tertiary-fixed mb-2">92%</div>
                <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-on-tertiary-fixed w-[92%]" />
                </div>
              </div>
            </div>
            {/* Profile Card */}
            <div className="col-span-2 row-span-1 bg-secondary-fixed rounded-xl p-6 flex items-center gap-4 transform -rotate-1">
              <img className="w-12 h-12 rounded-full border-2 border-white" data-alt="close-up portrait of a smiling young professional man with short curly hair against a soft studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDovHPkQelXcnTo3j2jzioKTL0nVwuvS6dMhb7V6gAlxI-G1eI9rituSks7nIgJyciISRuzGE8R0RY_ozYxDFa4EVonngRWzmuQRX9nMuIorz6S2yIGQB9b1UxLQSrR5FeK2dJrQOZCEyxiOYxGar4hz-QeYx6cfkZOqRVvI2KnDODDY-l6ixeXlEDNN9vAfqCpgxTDwgqWvxLlgIZbpezdIptAovYfQ5DWQDu7UsA7fRC3tdqVJvG-AW4dnEAa6LEhUMQxIjWFvx4" />
              <div>
                <div className="text-on-secondary-fixed font-bold">Alex Chen</div>
                <div className="text-on-secondary-fixed-variant text-xs font-medium">Ready for Interview</div>
              </div>
            </div>
            {/* Code Block Card */}
            <div className="col-span-1 row-span-2 bg-surface-container-highest/20 backdrop-blur-xl rounded-xl p-4 flex flex-col items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-primary-container text-3xl mb-2">code</span>
              <div className="text-[10px] font-mono text-white/60">main.py</div>
            </div>
            {/* Success Badge */}
            <div className="col-span-1 row-span-1 bg-white rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: '"FILL" 1'}}>verified</span>
            </div>
          </div>
          {/* Background Gradient Blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-tertiary/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4" />
        </section>
        {/* Right Side: Login Form */}
        <main className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-surface-container-lowest">
          <div className="w-full max-w-md">
            <header className="mb-10 lg:hidden">
              <div className="flex items-center gap-2 mb-8">
                <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: '"FILL" 1'}}>rocket_launch</span>
                </span>
                <span className="text-xl font-black tracking-tighter text-on-surface font-headline">Student OS</span>
              </div>
            </header>
            <div className="mb-10">
              <h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">Welcome Back</h2>
              <p className="text-on-surface-variant font-medium">Enter your credentials to access your workspace.</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest px-1">Select Identity</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Student Radio */}
                  <label className="relative cursor-pointer group">
                    <input defaultChecked className="peer sr-only" name="role" type="radio" defaultValue="student" />
                    <div className="p-4 rounded-lg bg-surface-container border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary-container/10 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant peer-checked:text-primary group-hover:scale-110 transition-transform">school</span>
                        <span className="font-bold text-on-surface">Student</span>
                      </div>
                    </div>
                  </label>
                  {/* Admin Radio */}
                  <label className="relative cursor-pointer group">
                    <input className="peer sr-only" name="role" type="radio" defaultValue="admin" />
                    <div className="p-4 rounded-lg bg-surface-container border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary-container/10 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant peer-checked:text-primary group-hover:scale-110 transition-transform">admin_panel_settings</span>
                        <span className="font-bold text-on-surface">Admin</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest px-1" htmlFor="email">Email Address</label>
                <div className="relative">
                  <input className="w-full px-6 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container text-on-surface font-medium placeholder:text-outline/50 transition-all" id="email" placeholder="hello@studentos.com" type="email" />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">alternate_email</span>
                </div>
              </div>
              {/* Password Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="password">Password</label>
                  <a className="text-xs font-bold text-primary hover:text-primary-dim transition-colors" href="#">Forgot?</a>
                </div>
                <div className="relative">
                  <input className="w-full px-6 py-4 rounded-lg bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container text-on-surface font-medium placeholder:text-outline/50 transition-all" id="password" placeholder="••••••••" type="password" />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                </div>
              </div>
              {/* Actions */}
              <div className="pt-4 space-y-6">
                <button className="w-full bg-primary-container text-on-primary-container font-bold py-4 px-6 rounded-full text-lg shadow-[0px_12px_24px_rgba(255,120,78,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2" type="submit">
                  Enter Workspace
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-surface-container-highest" />
                  <span className="flex-shrink mx-4 text-outline text-xs font-bold uppercase tracking-widest">New here?</span>
                  <div className="flex-grow border-t border-surface-container-highest" />
                </div>
                <a className="w-full flex items-center justify-center py-4 px-6 rounded-full border-2 border-outline-variant/30 text-on-surface font-bold hover:bg-surface-container transition-colors group" href="#">
                  Create Account
                  <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">person_add</span>
                </a>
              </div>
            </form>
            <footer className="mt-12 text-center">
              <p className="text-on-surface-variant text-sm font-medium">
                By continuing, you agree to our 
                <a className="underline text-on-surface hover:text-primary transition-colors" href="#">Terms of Service</a>.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
    
  );
}
