import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-slate-800 text-slate-400 py-10 px-4 md:px-12 border-t border-slate-700 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h4 className="text-lg font-black text-white mb-1">
            Sporty
          </h4>

          <p className="text-xs text-slate-400">
            © 2026 Sporty Platform. All rights reserved.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-300">
          <Link
            href="/terms"
            className="hover:text-white transition-colors"
          >
            Terms of Service
          </Link>

          <Link
            href="/privacy"
            className="hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>

          <Link
            href="/contact"
            className="hover:text-white transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}