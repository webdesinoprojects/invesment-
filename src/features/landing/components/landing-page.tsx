"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Leaf,
  Medal,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import Earth from "./globe";
import { Button } from "./landing-button";

const navigation = [
  ["About", "about"],
  ["Packages", "packages"],
  ["Income", "income"],
  ["Team", "team"],
  ["FAQ", "faq"],
] as const;

const stats = [
  ["125,000", "Active investors"],
  ["2.8", "Billion USD invested"],
  ["98", "Countries reached"],
  ["24", "Years of excellence"],
] as const;

const features = [
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    copy: "256-bit encryption with multi-layer protection for all transactions and data.",
  },
  {
    icon: Zap,
    title: "Instant Withdrawals",
    copy: "Lightning-fast payouts processed within minutes, with a 24/7 automated system.",
  },
  {
    icon: BarChart3,
    title: "Proven Track Record",
    copy: "24+ years of consistent growth with audited financial reports available.",
  },
];

const levels = [
  ["L1", "1%", "Level One"],
  ["L2", "0.25%", "Level Two"],
  ["L3", "0.25%", "Level Three"],
  ["L4+L5", "0.25%", "Level Four & Beyond"],
];

const timeline = [
  ["2020", "Foundation", "NEX-GEN POWER established with a vision for sustainable investments."],
  ["2021", "Global Expansion", "Reached 50+ countries with 10,000+ active investors."],
  ["2022", "$1B Milestone", "Surpassed $1 billion in total investments managed."],
  ["2023", "Innovation Award", "Launched AI-powered investment tools for smarter portfolios."],
  ["2024", "Market Leader", "Became the #1 green energy investment platform globally."],
];

const team = [
  ["JD", "James Donovan", "CEO & Founder"],
  ["SK", "Sarah Kim", "CFO"],
  ["MR", "Michael Rivera", "CTO"],
  ["AL", "Amara Li", "Head of Sustainability"],
];

const testimonials = [
  [
    "NEX-GEN POWER transformed my investment strategy. The returns are consistent and the team is incredibly supportive.",
    "RP",
    "Rahul Patel",
    "Professional Investor",
  ],
  [
    "I've been with NEX-GEN POWER for 3 years. The growth has been phenomenal and the green impact makes it even better.",
    "EM",
    "Elena Martinez",
    "Entrepreneur",
  ],
  [
    "The level income has created a reliable stream from my network. Transparent, simple and well supported.",
    "DK",
    "Daniel Kim",
    "Business Consultant",
  ],
];

const faqs = [
  ["How do I start investing?", "Simply choose a package, register an account, and make your first deposit. Our system activates your investment instantly."],
  ["When can I withdraw my returns?", "Returns are calculated monthly and can be withdrawn at any time. Withdrawals are processed within minutes."],
  ["Is my investment secure?", "Absolutely. We use bank-grade encryption and maintain segregated accounts for investor funds. All investments are protected."],
  ["How does the referral program work?", "Share your unique referral link. When someone invests through it, you earn direct commission plus level bonuses across multiple tiers."],
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: delay ? (Math.round(delay * 100) % 2 ? -72 : 72) : 0,
        y: delay ? 58 : 42,
        scale: .91,
        rotateX: 9,
      }}
      animate={inView ? { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  eyebrow,
  children,
  centered = true,
}: {
  eyebrow: string;
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <Reveal className={centered ? "section-heading centered" : "section-heading"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{children}</h2>
    </Reveal>
  );
}

function Logo() {
  return (
    <button className="logo" onClick={() => scrollTo("home")} aria-label={`${BRAND_NAME} home`}>
      <BrandMark className="logo-mark" priority />
      <span>NEX-GEN <span>POWER</span></span>
    </button>
  );
}

function StarField() {
  const stars = Array.from({ length: 120 }, (_, index) => ({
    left: `${(index * 37 + 11) % 100}%`,
    top: `${(index * 53 + 7) % 100}%`,
    delay: `${(index % 9) * 0.42}s`,
    size: `${2 + (index % 3)}px`,
  }));

  return (
    <div className="star-field" aria-hidden="true">
      {stars.map((star, index) => (
        <i key={index} style={{
          left: star.left,
          top: star.top,
          animationDelay: star.delay,
          width: star.size,
          height: star.size,
        }} />
      ))}
      {Array.from({ length: 22 }, (_, index) => (
        <b
          className={`depth-particle particle-${index % 4}`}
          key={`particle-${index}`}
          style={{
            left: `${(index * 43 + 3) % 100}%`,
            top: `${(index * 29 + 13) % 100}%`,
            animationDelay: `${-(index * .83)}s`,
            animationDuration: `${11 + (index % 7) * 1.7}s`,
          }}
        >
          {index % 3 === 0 ? "✦" : index % 3 === 1 ? "◆" : "●"}
        </b>
      ))}
    </div>
  );
}

function Globe() {
  return (
    <div className="globe-scene" aria-hidden="true">
      <div className="globe-glow" />
      <div className="globe-panel">
        <Earth className="webgl-globe" />
      </div>
      <div className="gold-orbit gold-orbit-front" />
      <div className="gold-orbit gold-orbit-back" />
      <div className="globe-horizon" />
      <div className="globe-sparkles">
        {Array.from({ length: 28 }, (_, index) => <i key={index} />)}
      </div>
    </div>
  );
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const numeric = Number(value.replace(/,/g, ""));
    const decimals = value.includes(".") ? (value.split(".")[1]?.length ?? 0) : 0;
    const started = performance.now();
    const duration = 1050;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = numeric * eased;
      setDisplay(current.toLocaleString("en-US", {
        minimumFractionDigits: progress === 1 ? decimals : 0,
        maximumFractionDigits: progress === 1 ? decimals : 0,
      }));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

function DonutChart() {
  return (
    <div className="dashboard-card">
      <div className="window-bar">
        <span className="window-dots"><i /><i /><i /></span>
        <span>Investment Dashboard</span>
      </div>
      <div className="chart-area">
        <div className="legend">
          <span><i className="solar" />Solar</span>
          <span><i className="wind" />Wind</span>
          <span><i className="hydro" />Hydro</span>
          <span><i className="bio" />Biomass</span>
        </div>
        <div className="donut" aria-label="Portfolio mix: Solar 40%, Wind 30%, Hydro 20%, Biomass 10%">
          <div className="donut-core"><Leaf size={38} /></div>
        </div>
      </div>
    </div>
  );
}

function LineChart() {
  const points = "20,180 110,150 200,120 290,90 380,60 470,30";
  return (
    <div className="simple-chart">
      <div className="chart-key"><i />ROI Growth %</div>
      <svg viewBox="0 0 500 210" role="img" aria-label="ROI growth from 8 to 18 percent">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16ab55" stopOpacity=".23" />
            <stop offset="1" stopColor="#16ab55" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 60, 90, 120, 150, 180].map((y) => <line key={y} x1="20" y1={y} x2="470" y2={y} />)}
        {[20, 110, 200, 290, 380, 470].map((x) => <line key={x} x1={x} y1="25" x2={x} y2="180" />)}
        <polygon points={`${points} 470,180 20,180`} fill="url(#area)" />
        <polyline points={points} fill="none" stroke="#16ab55" strokeWidth="4" />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="6" fill="#ffbd00" stroke="#16ab55" strokeWidth="2" />;
        })}
        {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, i) => (
          <text key={month} x={20 + i * 90} y="204" textAnchor="middle">{month}</text>
        ))}
      </svg>
    </div>
  );
}

function BarChart() {
  return (
    <div className="simple-chart bar-chart">
      <div className="chart-key"><i />Commission %</div>
      <div className="bars">
        {[["Starter", 33], ["Professional", 65], ["Enterprise", 96]].map(([label, height], i) => (
          <div className="bar-column" key={label}>
            <motion.i
              initial={{ height: 0 }}
              whileInView={{ height: `${height}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.12 }}
              className={`bar-${i}`}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={scrolled ? "header scrolled" : "header"}>
      <Logo />
      <nav className="desktop-nav">
        {navigation.map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}
      </nav>
      <div className="desktop-actions">
        <Link className="button button-outline" href="/login">Login</Link>
        <Link className="button button-primary" href="/register">Register</Link>
      </div>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
        {open ? <X /> : <Menu />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {navigation.map(([label, id]) => (
              <button key={id} onClick={() => { scrollTo(id); setOpen(false); }}>{label}</button>
            ))}
            <Link className="button button-outline" href="/login">Login</Link>
            <Link className="button button-primary" href="/register">Register</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>, message: string) {
    event.preventDefault();
    setNotice(message);
    event.currentTarget.reset();
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let result: { error?: string; ok?: boolean } = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = {};
      }
      if (!response.ok) throw new Error(result.error || "Unable to send message.");
      setNotice("Thanks — your message has been emailed to our team.");
      form.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSending(false);
      window.setTimeout(() => setNotice(""), 4500);
    }
  }

  return (
    <main className="landing-site">
      <StarField />
      <Header />

      <section id="home" className="hero">
        <Globe />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          <div className="hero-badge"><span>🌱</span> Sustainable investments</div>
          <h1>Power Your Future<br />With <span>Green Energy</span></h1>
          <p>Join a forward-thinking community growing wealth sustainably through carefully selected renewable-energy opportunities.</p>
          <div className="hero-actions">
            <Button onClick={() => scrollTo("packages")}>Explore Packages <ArrowRight size={18} /></Button>
            <Button variant="outline" onClick={() => scrollTo("about")}>Learn More</Button>
          </div>
          <div className="scroll-cue"><span>Scroll to discover</span><ChevronDown /></div>
        </motion.div>
      </section>

      <section className="stats-section">
        <div className="container stat-grid">
          {stats.map(([value, label], index) => (
            <Reveal key={label} delay={index * 0.08} className="stat-card interactive-card">
              <strong><CountUp value={value} /></strong><span>{label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="about" className="content-section about-section">
        <div className="container about-grid">
          <Reveal className="about-copy">
            <span className="eyebrow">About us</span>
            <h2>Leading The <em>Green<br />Revolution</em> In Finance</h2>
            <p>NEX-GEN POWER is a premier investment company dedicated to sustainable energy projects worldwide. We combine financial expertise with environmental stewardship to deliver exceptional value.</p>
            {[
              ["Renewable Energy Projects", 94],
              ["Investor Satisfaction", 98],
              ["Sustainable Growth Rate", 87],
            ].map(([label, value]) => (
              <div className="progress-row" key={label}>
                <div><span>{label}</span><span>{value}%</span></div>
                <div className="progress"><motion.i initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 1.2 }} /></div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.15}><DonutChart /></Reveal>
        </div>
      </section>

      <section className="content-section features-section">
        <div className="container">
          <SectionTitle eyebrow="Why choose us">Built For <em>Smart Investors</em></SectionTitle>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, copy }, index) => (
              <Reveal className="feature-card interactive-card" key={title} delay={index * 0.1}>
                <Icon />
                <h3>{title}</h3>
                <p>{copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="content-section packages-section">
        <div className="container">
          <SectionTitle eyebrow="Investment packages">Choose Your <em>Growth Plan</em></SectionTitle>
          <Reveal className="plan-card">
            <span className="popular">Most Popular</span>
            <div className="plan-top">
              <div>
                <span className="plan-label">Professional</span>
                <h3><small>$</small>10 <span>& so on</span></h3>
              </div>
              <Sparkles />
            </div>
            <ul>
              {["8% Monthly ROI", "Direct Commission 5%", "Level 1–5 Bonus", "Priority Support", "Exclusive Rewards"].map(item => (
                <li key={item}><span><Check size={14} /></span>{item}</li>
              ))}
            </ul>
            <Link className="button button-gold" href="/login">Invest Now <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>

      <section id="income" className="content-section income-section">
        <div className="container income-grid">
          <Reveal>
            <span className="eyebrow">ROI income</span>
            <h2>Earn <em>Passive Returns</em><br />Monthly</h2>
            <p>Our investment plans are designed around diversified green energy portfolios. Follow growth while supporting sustainable initiatives.</p>
            <LineChart />
          </Reveal>
          <Reveal delay={0.12}>
            <span className="eyebrow">Direct income</span>
            <h2>Earn From <em>Your Network</em></h2>
            <p>Refer eligible investors and follow your qualified direct commissions through a clear, transparent dashboard.</p>
            <BarChart />
          </Reveal>
        </div>
      </section>

      <section className="content-section levels-section">
        <div className="container">
          <SectionTitle eyebrow="Level income">Multi-Level <em>Earning Power</em></SectionTitle>
          <p className="section-intro">See the complete qualified commission structure across your referral network.</p>
          <div className="level-grid">
            {levels.map(([level, percent, label], index) => (
              <Reveal className="level-card interactive-card" key={level} delay={index * .08}>
                <strong>{level}</strong><b>{percent}</b><span>{label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section awards-section">
        <div className="container">
          <SectionTitle eyebrow="Recognition">Awards & <em>Rewards</em></SectionTitle>
          <div className="award-grid">
            {[
              [Trophy, "Best Green Investment Platform 2024", "Global FinTech Awards"],
              [Medal, "Sustainability Excellence", "UN Green Initiative"],
              [Star, "Top 10 Investment Platform", "Finance World"],
            ].map(([Icon, title, org], index) => {
              const IconComponent = Icon as typeof Trophy;
              return (
                <Reveal className="award-card interactive-card" key={String(title)} delay={index * .1}>
                  <IconComponent fill="currentColor" />
                  <h3>{String(title)}</h3><p>{String(org)}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="content-section journey-section">
        <div className="container">
          <SectionTitle eyebrow="Our journey">Business <em>Growth Timeline</em></SectionTitle>
          <div className="timeline">
            {timeline.map(([year, title, copy], index) => (
              <Reveal className="timeline-card interactive-card" key={year} delay={Math.min(index * .06, .2)}>
                <span>{year}</span><h3>{title}</h3><p>{copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="content-section team-section">
        <div className="container">
          <SectionTitle eyebrow="Our team">Meet The <em>Experts</em></SectionTitle>
          <div className="team-grid">
            {team.map(([initials, name, role], index) => (
              <Reveal className="team-card interactive-card" key={name} delay={index * .08}>
                <span>{initials}</span><h3>{name}</h3><p>{role}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section testimonials-section">
        <div className="container">
          <SectionTitle eyebrow="Testimonials">What <em>Investors Say</em></SectionTitle>
          <div className="testimonial-grid">
            {testimonials.map(([quote, initials, name, role], index) => (
              <Reveal className="testimonial-card interactive-card" key={name} delay={index * .1}>
                <div className="stars">★★★★★</div>
                <blockquote>“{quote}”</blockquote>
                <span>{initials}</span><h3>{name}</h3><p>{role}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="content-section faq-section">
        <div className="container narrow">
          <SectionTitle eyebrow="FAQ">Frequently <em>Asked Questions</em></SectionTitle>
          <div className="accordion">
            {faqs.map(([question, answer], index) => (
              <div className={openFaq === index ? "faq-item open" : "faq-item"} key={question}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                  {question}<ChevronDown />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <p>{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="content-section contact-section">
        <div className="container">
          <SectionTitle eyebrow="Contact us" centered={false}>Get In <em>Touch</em></SectionTitle>
          <div className="contact-grid">
            <Reveal>
              <form className="contact-form" onSubmit={submitContact}>
                <input required name="name" placeholder="Your Name" aria-label="Your name" />
                <input required name="email" type="email" placeholder="Email Address" aria-label="Email address" />
                <select name="package" defaultValue="" required aria-label="Select package">
                  <option value="" disabled>Select Package</option>
                  <option>Professional</option><option>Enterprise</option>
                </select>
                <textarea required name="message" placeholder="Your Message" aria-label="Your message" />
                <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send Message"} <ArrowRight size={18} /></Button>
              </form>
            </Reveal>
            <Reveal delay={.12} className="location-card">
              <div className="map-lines" />
              <div className="map-pin"><Leaf /></div>
              <div className="location-info">
                <span>NEX-GEN POWER HQ</span>
                <strong>New Delhi, India</strong>
                <small>Global support • Monday–Saturday</small>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <Reveal className="newsletter">
          <span className="eyebrow">Newsletter</span>
          <h2>Stay <em>Updated</em></h2>
          <p>Get sustainable-energy insights and company news delivered to your inbox.</p>
          <form onSubmit={(event) => submit(event, "You’re subscribed — welcome to NEX-GEN POWER.")}>
            <input required type="email" placeholder="Enter your email" aria-label="Newsletter email" />
            <Button type="submit">Subscribe</Button>
          </form>
        </Reveal>
      </section>

      <AnimatePresence>
        {notice && (
          <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <span><Check /></span>{notice}
          </motion.div>
        )}
      </AnimatePresence>

      <footer>
        <div className="container footer-grid">
          <div><Logo /><p>Premium green-energy opportunities for a more sustainable and prosperous future.</p></div>
          <div><h3>Quick Links</h3>{navigation.slice(0, 4).map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}</div>
          <div><h3>Legal</h3><button>Privacy Policy</button><button>Terms of Service</button><button>Risk Disclosure</button><button>Compliance</button></div>
          <div><h3>Connect</h3><p>hello@nexgenpower.example</p><p>New Delhi, India</p></div>
        </div>
        <div className="container copyright">© 2026 NEX-GEN POWER. All rights reserved.<span>Designed for a greener tomorrow.</span></div>
      </footer>
    </main>
  );
}
