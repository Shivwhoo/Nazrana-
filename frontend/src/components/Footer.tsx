import React from 'react';
import Link from 'next/link';
import { NazranaLogo } from './NazranaLogo';

export function GlobalFooter() {
  return (
    <footer className="bg-[#221C14] text-[#FAF6EE] py-16 px-8 w-full font-sans mt-auto border-t border-[#3a3227]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-12">
        <div className="flex flex-col items-center lg:items-start gap-4 lg:w-1/3">
          <div className="flex items-center gap-4">
             <NazranaLogo size={42} className="text-[#FAF6EE]" />
             <span className="font-serif font-bold text-3xl tracking-tight text-[#FAF6EE]">Nazrana</span>
          </div>
          <div className="text-[10px] tracking-[1.5px] uppercase text-[#B4B2A9]">
            powered by edmentor
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm lg:w-2/3">
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-white mb-2">Learn</h4>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Courses</Link>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Events</Link>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Scholarships</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-white mb-2">Company</h4>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">About</Link>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Blog</Link>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-white mb-2">Support</h4>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Terms</Link>
            <a href="mailto:help@theedmentor.com" className="text-stone-400 hover:text-white transition-colors">help@theedmentor.com</a>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-white mb-2">Products</h4>
            <Link href="#" className="text-stone-400 hover:text-white transition-colors">Platform</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
