import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <p className="font-display text-4xl text-accent">USCL</p>
          <p className="mt-3 text-sm text-white/55">
            India’s first franchise cricket league for the US Staffing industry.
          </p>
          <div className="relative mt-5 h-14 w-44 overflow-hidden rounded-md bg-white p-2">
            <Image
              src="/brand/wesley-elite-sports.png"
              alt="Wesley Elite Sports"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Explore</p>
            <ul className="mt-3 space-y-2 text-white/65">
              <li>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/franchises" className="hover:text-white">
                  Teams
                </Link>
              </li>
              <li>
                <Link href="/franchise" className="hover:text-white">
                  Own a Franchise
                </Link>
              </li>
              <li>
                <Link href="/sponsorship" className="hover:text-white">
                  Sponsors
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white">
                  Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Account</p>
            <ul className="mt-3 space-y-2 text-white/65">
              <li>
                <Link href="/signup" className="hover:text-white">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Organized by</p>
          <p className="font-display mt-3 text-2xl">Wesley Elite Sports</p>
          <Link href="/wesley" className="mt-2 inline-block text-sm text-accent hover:underline">
            Our journey →
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/35">
        © {new Date().getFullYear()} US Staffing Champions League
      </div>
    </footer>
  );
}
