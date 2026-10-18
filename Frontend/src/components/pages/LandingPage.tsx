import { useState } from "react";
import { Link } from "react-router";
import {
  Activity, ArrowDown, ArrowRight, CalendarDays, Check, ClipboardPlus,
  CreditCard, Menu, Pill, ShieldCheck, UsersRound, X,
} from "lucide-react";
import CareBaseLogo from "../../assets/carebase-logo-full.svg";
import styles from "../../styles/LandingPage.module.scss";

const workflowItems = [
  { icon: CalendarDays, title: "Appointments", detail: "Keep scheduling and daily visits in one shared view." },
  { icon: ClipboardPlus, title: "Clinical work", detail: "Support encounters, consultations, admissions, and care workflows." },
  { icon: Pill, title: "Pharmacy", detail: "Manage medicine records and pharmacy sales in the same workspace." },
  { icon: CreditCard, title: "Billing", detail: "Bring invoices, payments, and billing rates together." },
];

const teamRoles = [
  { role: "Care teams", detail: "Work with patient and clinical information relevant to their role." },
  { role: "Front desk", detail: "Coordinate appointments and patient-facing workflows." },
  { role: "Hospital leadership", detail: "Manage staff, departments, and hospital settings." },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link className={styles.brand} to="/" aria-label="CareBase home" onClick={closeMenu}>
            <img src={CareBaseLogo} alt="CareBase" />
          </Link>

          <div id="landing-navigation" className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ""}`}>
            <a href="#platform" onClick={closeMenu}>Platform</a>
            <a href="#workflows" onClick={closeMenu}>Workflows</a>
            <a href="#access" onClick={closeMenu}>Access</a>
            <div className={styles.mobileActions}>
              <Link className={styles.mobileSignIn} to="/login" onClick={closeMenu}>Sign in</Link>
              <Link className={styles.buttonPrimary} to="/signup" onClick={closeMenu}>Create a hospital workspace <ArrowRight size={17} /></Link>
            </div>
          </div>

          <div className={styles.desktopActions}>
            <Link className={styles.signIn} to="/login">Sign in</Link>
            <Link className={styles.buttonPrimary} to="/signup">Get started <ArrowRight size={17} /></Link>
          </div>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>

      <section className={styles.hero} id="platform">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><Activity size={15} /> A connected workspace for healthcare teams</span>
            <h1>Hospital operations, <span>working together.</span></h1>
            <p>CareBase brings everyday hospital workflows into one organized system, helping teams coordinate patient care and the work around it.</p>
            <div className={styles.heroActions}>
              <Link className={styles.buttonPrimary} to="/signup">Create your hospital workspace <ArrowRight size={18} /></Link>
              <a className={styles.buttonSecondary} href="#workflows">Explore the platform <ArrowDown size={17} /></a>
            </div>
            <div className={styles.heroNote}><ShieldCheck size={17} /> Role-based access for the people on your team</div>
          </div>

          <div className={styles.previewWrap} aria-label="Illustrative CareBase workspace preview">
            <div className={styles.previewGlow} />
            <div className={styles.workspacePreview}>
              <div className={styles.previewTopbar}>
                <div className={styles.previewBrand}><span className={styles.previewMark}><Activity size={14} /></span><span>CareBase</span></div>
                <span className={styles.previewWorkspace}>Hospital workspace</span>
                <span className={styles.previewAvatar}>CB</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewSidebar} aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <div className={styles.previewContent}>
                  <div className={styles.previewHeading}><div><small>WORKSPACE OVERVIEW</small><strong>Today at a glance</strong></div><span className={styles.previewDate}>CareBase</span></div>
                  <div className={styles.previewStats}>
                    <div><span>Patient records</span><strong><UsersRound size={17} /></strong><small>Organized in one place</small></div>
                    <div><span>Appointments</span><strong><CalendarDays size={17} /></strong><small>Coordinate daily visits</small></div>
                    <div><span>Clinical work</span><strong><ClipboardPlus size={17} /></strong><small>Connected care workflows</small></div>
                  </div>
                  <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}><strong>Connected workflows</strong><span>CareBase modules</span></div>
                    {workflowItems.slice(0, 3).map(({ icon: Icon, title, detail }) => (
                      <div className={styles.previewRow} key={title}><span className={styles.previewRowIcon}><Icon size={16} /></span><span><b>{title}</b><small>{detail}</small></span><Check size={15} className={styles.rowCheck} /></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.previewCaption}>A clearer view of the work your teams do every day.</div>
          </div>
        </div>
        <div className={styles.heroBottom}><span>CARE, COORDINATED</span><span>OPERATIONS, CONNECTED</span><span>TEAMS, IN SYNC</span></div>
      </section>

      <section className={styles.intro}>
        <div className={styles.sectionLabel}>ONE WORKSPACE, MANY TEAMS</div>
        <h2>Less switching between tasks.<br />More clarity across the hospital.</h2>
        <p>CareBase connects administrative and clinical workflows so your team can spend less time chasing information between systems.</p>
      </section>

      <section className={styles.workflowSection} id="workflows">
        <div className={styles.workflowIntro}>
          <div><div className={styles.sectionLabel}>BUILT AROUND YOUR WORK</div><h2>Everyday hospital workflows, in one place.</h2></div>
          <p>Move between patient, clinical, and operational work with a consistent view of the information your role needs.</p>
        </div>
        <div className={styles.workflowGrid}>
          {workflowItems.map(({ icon: Icon, title, detail }, index) => (
            <article className={styles.workflowCard} key={title}>
              <div className={styles.cardTop}><span className={styles.workflowIcon}><Icon size={21} /></span><span className={styles.cardNumber}>0{index + 1}</span></div>
              <h3>{title}</h3><p>{detail}</p>
              <span className={styles.cardRule} />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.darkInner}>
          <div className={styles.darkCopy}>
            <div className={styles.sectionLabel}>ACCESS WITH PURPOSE</div>
            <h2>Give each team a workspace that fits their role.</h2>
            <p>CareBase includes role-based permissions so access can follow the responsibilities assigned by your hospital.</p>
            <a className={styles.darkLink} href="#access">See how teams use CareBase <ArrowRight size={17} /></a>
          </div>
          <div className={styles.permissionCard}>
            <div className={styles.permissionHeader}><ShieldCheck size={21} /><span>Role-based workspace</span><span className={styles.permissionStatus}>Configured by your hospital</span></div>
            {teamRoles.map(({ role, detail }) => <div className={styles.permissionRow} key={role}><span className={styles.permissionDot} /><span><b>{role}</b><small>{detail}</small></span><ArrowRight size={16} /></div>)}
            <div className={styles.permissionFoot}>Permissions are managed by authorized hospital administrators.</div>
          </div>
        </div>
      </section>

      <section className={styles.accessSection} id="access">
        <div className={styles.accessHeading}><div className={styles.sectionLabel}>DESIGNED FOR REAL TEAMS</div><h2>One system for the work behind better care.</h2><p>Bring staff, departments, and daily operations into a shared hospital workspace.</p></div>
        <div className={styles.accessGrid}>
          <article><span className={styles.accessIndex}>01</span><h3>Clear responsibilities</h3><p>Assign roles and permissions that reflect how your hospital organizes system access.</p></article>
          <article><span className={styles.accessIndex}>02</span><h3>Connected operations</h3><p>Keep appointments, patient records, clinical workflows, pharmacy, and billing close at hand.</p></article>
          <article><span className={styles.accessIndex}>03</span><h3>Room to grow</h3><p>Set up hospital teams, departments, and workflows as your organization takes shape.</p></article>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaPattern} aria-hidden="true" />
        <div className={styles.ctaContent}><div className={styles.sectionLabel}>START WITH YOUR HOSPITAL</div><h2>Bring your hospital’s work together with CareBase.</h2><p>Create an account, set up your hospital profile, and submit it for approval.</p><Link className={styles.ctaButton} to="/signup">Start hospital registration <ArrowRight size={18} /></Link><small>Already have an account? <Link to="/login">Sign in</Link></small></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}><Link to="/" aria-label="CareBase home"><img src={CareBaseLogo} alt="CareBase" /></Link><p>Tools for the people and workflows that keep hospitals moving.</p><div className={styles.footerLinks}><a href="#platform">Platform</a><a href="#workflows">Workflows</a><a href="#access">Access</a><Link to="/login">Sign in</Link><Link to="/signup">Create account</Link></div></div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} CareBase</span><span>Hospital management workspace</span></div>
      </footer>
    </main>
  );
}
