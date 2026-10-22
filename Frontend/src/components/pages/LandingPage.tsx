import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardPlus,
  CreditCard,
  Database,
  FileText,
  Menu,
  Monitor,
  Pill,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Logo from "../../assets/carebase-logo-full.svg";
import FooterLogo from "../../assets/carebase-logo-full.svg";
import styles from "../../styles/LandingPage.module.scss";

const workflowSteps = [
  { icon: CalendarDays, title: "Appointments", titleDetail: "Help patients find an available doctor and confirm a visit.", stage: "Patient access", items: ["Browse available doctors", "Choose an available time", "Receive a private booking code"] },
  { icon: Stethoscope, title: "Clinical care", titleDetail: "Continue the visit in the patient’s clinical record.", stage: "Care team workflow", items: ["Open the patient encounter", "Record consultation details", "Keep the care history connected"] },
  { icon: Pill, title: "Pharmacy", titleDetail: "Connect prescriptions and medicine dispensing to care.", stage: "Pharmacy workflow", items: ["Review prescribed medicines", "Check pharmacy stock", "Record the medicine sale"] },
  { icon: CreditCard, title: "Billing", titleDetail: "Keep invoice and payment activity alongside the visit.", stage: "Hospital operations", items: ["Prepare appointment charges", "Review invoice balance", "Record collected payment"] },
];

const platformFeatures = [
  { icon: Database, title: "Connected patient records", detail: "Keep patient, appointment, and clinical information together across hospital workflows." },
  { icon: ShieldCheck, title: "Role-based access", detail: "Give staff access that matches the responsibilities assigned by hospital administrators." },
  { icon: FileText, title: "Auditable operations", detail: "Keep a record of important actions across clinical, pharmacy, and billing work." },
];
const productScreens = [
  { label: "Overview", icon: Monitor, title: "Hospital overview", detail: "Daily activity and operational trends" },
  { label: "Patients", icon: UserRound, title: "Patient records", detail: "A connected view of each patient’s care" },
  { label: "Appointments", icon: CalendarDays, title: "Appointments", detail: "Schedules and visit status in one place" },
  { label: "Clinical desk", icon: Stethoscope, title: "Clinical desk", detail: "Coordinate the queue and active encounters" },
  { label: "Staff", icon: UsersRound, title: "Staff directory", detail: "Find team members and manage profiles" },
  { label: "Billing", icon: ReceiptText, title: "Billing", detail: "Review invoices and collected payments" },
];
const revealDelays = [styles.delay1, styles.delay2, styles.delay3, styles.delay4];

function useScrollReveal() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(`[data-reveal]`));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add(styles.active));
      return;
    }

    root.classList.add(styles.revealReady);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.active);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });

    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.classList.remove(styles.revealReady);
    };
  }, []);

  return rootRef;
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [activeProductScreen, setActiveProductScreen] = useState(0);
  const pageRef = useScrollReveal();
  const closeMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
    {showIntro && <div className={styles.splashScreen} role="status" aria-label="Loading CareBase">
      <img className={styles.splashLogo} src="/carebase-logo-icon.svg" alt="CareBase" />
      <span className={styles.splashLogoShadow} aria-hidden="true" />
      <span className={styles.splashWordmark}>Care<span>Base</span></span>
    </div>}
    <main className={`${styles.layout} ${showIntro ? styles.layoutHidden : ""}`} ref={pageRef} aria-hidden={showIntro}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link className={styles.logo} to="/" aria-label="CareBase home" onClick={closeMenu}>
            <img src={Logo} alt="CareBase" />
          </Link>

          <div id="landing-navigation" className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ""}`}>
            <a href="#platform" onClick={closeMenu}>Platform</a>
            <a href="#workflows" onClick={closeMenu}>Workflows</a>
            <a href="#security" onClick={closeMenu}>Security</a>
            <div className={styles.mobileActions}>
              <Link className={styles.mobileLink} to="/book-appointment" onClick={closeMenu}>Book an appointment</Link>
              <Link className={styles.mobileLink} to="/my-appointments" onClick={closeMenu}>View my appointment</Link>
              <Link className={styles.mobileLink} to="/login" onClick={closeMenu}>Sign in</Link>
              <Link className={styles.buttonPrimary} to="/signup" onClick={closeMenu}>Create a hospital account <ArrowRight size={17} /></Link>
            </div>
          </div>

          <div className={styles.desktopActions}>
            <Link className={styles.patientLink} to="/book-appointment">Book as a patient</Link>
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
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}><Activity size={15} /> A connected workspace for healthcare teams</span>
            <h1>Hospital operations, <span>working together.</span></h1>
            <p>CareBase brings patient care, appointments, pharmacy, and billing workflows into one organized hospital system.</p>
            <div className={styles.heroActions}>
              <Link className={styles.buttonPrimary} to="/signup">Create your hospital workspace <ArrowRight size={18} /></Link>
              <Link className={styles.buttonSecondary} to="/book-appointment">Book an appointment <CalendarDays size={17} /></Link>
            </div>
            <div className={styles.heroNote}><ShieldCheck size={17} /> Role-based access for hospital teams</div>
          </div>

          <div className={styles.heroVisual} aria-label="Illustrative CareBase hospital dashboard preview">
            <div className={styles.visualGlow} />
            <div className={styles.previewOrbit} aria-hidden="true" />
            <div className={styles.dashboardPreview}>
              <div className={styles.previewTopbar}>
                <span className={styles.previewBrand}><span className={styles.previewBrandMark}><Activity size={14} /></span>CareBase</span>
                <span className={styles.previewWorkspace}>Hospital workspace</span>
                <span className={styles.previewAvatar}>CB</span>
              </div>
              <div className={styles.previewMain}>
                <aside className={styles.previewSidebar} aria-hidden="true">
                  <span className={styles.sidebarActive}><Activity size={15} /></span>
                  <span><CalendarDays size={15} /></span>
                  <span><UsersRound size={15} /></span>
                  <span><Pill size={15} /></span>
                  <span><CreditCard size={15} /></span>
                </aside>
                <div className={styles.previewContent}>
                  <div className={styles.previewKicker}>ILLUSTRATIVE PREVIEW <span>Sample workspace</span></div>
                  <div className={styles.previewHeading}><div><small>HOSPITAL OVERVIEW</small><strong>Today at a glance</strong></div><span className={styles.previewDate}>CareBase</span></div>
                  <div className={styles.previewStats}>
                    <div><span>Appointments</span><strong><CalendarDays size={17} /></strong><small>Scheduling</small></div>
                    <div><span>Patient records</span><strong><UsersRound size={17} /></strong><small>Care history</small></div>
                    <div><span>Hospital work</span><strong><ClipboardPlus size={17} /></strong><small>Connected teams</small></div>
                  </div>
                  <div className={styles.previewPanel}>
                    <div className={styles.panelTitle}><strong>Connected workflows</strong><span>One workspace</span></div>
                    <div className={styles.previewRow}><span className={styles.previewRowIcon}><Stethoscope size={15} /></span><span><b>Clinical care</b><small>Encounters and consultations</small></span><span className={styles.previewCheck}>✓</span></div>
                    <div className={styles.previewRow}><span className={styles.previewRowIcon}><Pill size={15} /></span><span><b>Pharmacy</b><small>Medicine and sales workflows</small></span><span className={styles.previewCheck}>✓</span></div>
                    <div className={styles.previewRow}><span className={styles.previewRowIcon}><CreditCard size={15} /></span><span><b>Billing</b><small>Invoices and payments</small></span><span className={styles.previewCheck}>✓</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.previewCaption}><ShieldCheck size={15} /> Connected hospital workflows, with role-based access</div>
          </div>
        </div>
        <div className={styles.heroBottom}><span>CARE, COORDINATED</span><span>OPERATIONS, CONNECTED</span><span>TEAMS, IN SYNC</span></div>
      </section>

      <section className={styles.productSection} aria-labelledby="product-preview-title">
        <div className={styles.productIntro} data-reveal>
          <p className={styles.sectionLabel}>A CLOSER LOOK AT CAREBASE</p>
          <h2 id="product-preview-title">One workspace for the work behind every visit.</h2>
          <p>Move between patient records, clinical care, staffing, appointments, and billing without losing the context your team needs.</p>
        </div>
        <div className={styles.productShowcase} data-reveal>
          <div className={styles.productTabs} role="tablist" aria-label="CareBase product screens">
            {productScreens.map(({ label, icon: Icon }, index) => (
              <button type="button" role="tab" aria-selected={activeProductScreen === index} aria-controls="product-screen-preview" id={`product-tab-${index}`} key={label} onClick={() => setActiveProductScreen(index)}>
                <Icon size={16} /><span>{label}</span>
              </button>
            ))}
          </div>
          <div className={styles.productWindow} id="product-screen-preview" role="tabpanel" aria-labelledby={`product-tab-${activeProductScreen}`}>
            <div className={styles.productBar}><span className={styles.productBrand}><span><Activity size={13} /></span>CareBase</span><span className={styles.productWorkspace}>Northstar Medical Center</span><span className={styles.productAvatar}>AD</span></div>
            <div className={styles.productBody}>
              <aside className={styles.productRail} aria-hidden="true"><Activity /><CalendarDays /><UsersRound /><Stethoscope /><Pill /><ReceiptText /></aside>
              <div className={styles.productCanvas}>
                <div className={styles.productCanvasHead}><div><small>CAREBASE WORKSPACE</small><h3>{productScreens[activeProductScreen].title}</h3><p>{productScreens[activeProductScreen].detail}</p></div><span className={styles.productAction}>Today <CalendarDays size={13} /></span></div>
                {activeProductScreen === 0 && <div className={styles.productDashboard}>
                  <div className={styles.productStats}><div><small>Active patients</small><b>248</b><span>Across your hospital</span></div><div><small>Appointments today</small><b>32</b><span>6 still to come</span></div><div><small>Open encounters</small><b>08</b><span>Care team activity</span></div><div><small>Available beds</small><b>14</b><span>Of 38 total beds</span></div></div>
                  <div className={styles.productChartCard}><div><b>Monthly hospital activity</b><small>Visits and completed encounters</small></div><div className={styles.productChart} aria-label="Illustrative monthly activity chart">{[34, 53, 45, 72, 59, 88, 67, 94, 76, 62, 84, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className={styles.productMonths}><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div>
                </div>}
                {activeProductScreen === 1 && <div className={styles.productRecord}><div className={styles.productList}><div className={styles.productSearch}>⌕ <span>Search patient records</span></div>{["Jordan Lee", "Taylor Morgan", "Casey Parker"].map((name, index) => <div className={index === 0 ? styles.productSelected : ""} key={name}><span className={styles.productInitials}>{name.split(" ").map((n) => n[0]).join("")}</span><span><b>{name}</b><small>MRN •••• {String(142 + index)}</small></span></div>)}</div><div className={styles.productPatient}><span className={styles.productTag}>CLINICAL RECORD</span><h4>Jordan Lee</h4><small>Patient overview · Sample data</small><div className={styles.productVitals}>{[["Blood pressure", "118/76", "mmHg"], ["Heart rate", "72", "bpm"], ["Temperature", "36.8", "°C"], ["Oxygen", "98", "%"]].map(([label, value, unit]) => <div key={label}><small>{label}</small><b>{value} <i>{unit}</i></b></div>)}</div><div className={styles.productNote}><b>Recent visit</b><span>Routine follow-up · Care notes available to the assigned team</span></div></div></div>}
                {activeProductScreen === 2 && <div className={styles.productTable}><div className={styles.productTableHead}><span>TIME</span><span>PATIENT</span><span>DOCTOR</span><span>STATUS</span></div>{[["09:00 AM", "Jordan Lee", "Dr. Alex Kim", "Checked in"], ["09:30 AM", "Taylor Morgan", "Dr. Sam Patel", "Confirmed"], ["10:00 AM", "Casey Parker", "Dr. Alex Kim", "Confirmed"]].map((row) => <div className={styles.productTableRow} key={row[0]}>{row.map((cell, i) => <span key={i}>{cell}</span>)}</div>)}</div>}
                {activeProductScreen === 3 && <div className={styles.productQueue}><div className={styles.productQueueList}><b>Patient queue <span>3 waiting</span></b>{[["01", "Jordan Lee", "Cardiology"], ["02", "Taylor Morgan", "Family medicine"], ["03", "Casey Parker", "Cardiology"]].map((row, i) => <div className={i === 0 ? styles.productQueueActive : ""} key={row[0]}><b>#{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]}</small></span><small>{i === 0 ? "In progress" : "Waiting"}</small></div>)}</div><div className={styles.productEncounter}><span className={styles.productTag}>ACTIVE ENCOUNTER</span><h4>Visit details</h4><p>Patient <b>Jordan Lee</b></p><p>Department <b>Cardiology</b></p><p>Visit type <b>Follow-up</b></p><div className={styles.productEncounterButton}>Open clinical record <ArrowRight size={13} /></div></div></div>}
                {activeProductScreen === 4 && <div className={styles.productStaffGrid}>{[["AM", "Avery Martin", "Physician", "Clinical"], ["SC", "Skyler Chen", "Pharmacist", "Pharmacy"], ["RM", "Riley Murphy", "HR manager", "Administration"], ["JD", "Jamie Diaz", "Nurse", "Clinical"]].map((row) => <div key={row[0]}><span className={styles.productInitials}>{row[0]}</span><span><b>{row[1]}</b><small>{row[2]}</small></span><i>{row[3]}</i></div>)}</div>}
                {activeProductScreen === 5 && <div className={styles.productInvoice}><div className={styles.productInvoiceHead}><div><span className={styles.productTag}>INVOICE · SAMPLE</span><h4>Invoice #CB-1048</h4><small>Issued October 19, 2026</small></div><span className={styles.productPaid}>PAID</span></div><div className={styles.productInvoiceRow}><b>Description</b><b>Category</b><b>Total</b></div><div className={styles.productInvoiceRow}><span>Consultation · Sample patient</span><span>Outpatient</span><span>PKR 2,500</span></div><div className={styles.productInvoiceTotal}><span>Total paid</span><b>PKR 2,500.00</b></div></div>}
                <div className={styles.productPrivacy}><ShieldCheck size={13} /> Illustrative sample data · Patient information is private to each hospital</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.timelineSection} id="workflows">
        <div className={styles.timelineGrid}>
          <div className={`${styles.timelineIntro} ${styles.reveal}`} data-reveal>
            <p className={styles.sectionLabel}>HOW THE WORK CONNECTS</p>
            <h2>Follow a patient journey from appointment through billing.</h2>
            <p className={styles.sectionCopy}>Keep daily hospital work connected, with each team able to use the information needed for its role.</p>
            <div className={styles.journeyTabs} role="group" aria-label="Explore CareBase workflows">
              {workflowSteps.map(({ icon: Icon, title }, index) => (
                <button
                  className={`${styles.journeyTab} ${activeWorkflow === index ? styles.journeyTabActive : ""}`}
                  type="button"
                  aria-pressed={activeWorkflow === index}
                  key={title}
                  onClick={() => setActiveWorkflow(index)}
                >
                  <span className={styles.journeyTabIcon}><Icon size={18} /></span>
                  <span className={styles.journeyTabText}><b>{title}</b><small>{index === 0 ? "Before the visit" : index === 1 ? "During the visit" : "After the visit"}</small></span>
                  <span className={styles.journeyTabNumber}>0{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`${styles.journeyShowcase} ${styles.reveal}`} data-reveal>
            <article
              className={styles.journeyPanel}
              aria-live="polite"
              key={activeWorkflow}
            >
              <div className={styles.journeyPanelTop}>
                <div className={styles.journeyPanelBrand}><span><Activity size={14} /></span>CareBase workflow</div>
                <span className={styles.sampleBadge}>ILLUSTRATIVE</span>
              </div>
              <div className={styles.journeyPanelIntro}>
                <span className={styles.journeyStage}>STEP 0{activeWorkflow + 1} <i /> {workflowSteps[activeWorkflow].stage}</span>
                <h3>{workflowSteps[activeWorkflow].title}</h3>
                <p>{workflowSteps[activeWorkflow].titleDetail}</p>
              </div>
              <div className={styles.journeyTaskList}>
                {workflowSteps[activeWorkflow].items.map((item, index) => (
                  <div className={styles.journeyTask} key={item}>
                    <span className={index === 0 ? styles.taskCurrent : styles.taskComplete}>{index === 0 ? <Activity size={14} /> : <Check size={14} />}</span>
                    <span>{item}</span>
                    {index < 2 && <CheckCircle2 className={styles.taskCheck} size={15} />}
                  </div>
                ))}
              </div>
              <div className={styles.journeyProgress} aria-hidden="true">
                {workflowSteps.map((step, index) => (
                  <span className={index < activeWorkflow ? styles.progressDone : index === activeWorkflow ? styles.progressCurrent : ""} key={step.title} />
                ))}
              </div>
              <div className={styles.journeyPanelFoot}><ShieldCheck size={16} /><span>Information stays connected across authorized CareBase workflows.</span></div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.patientSection}>
        <div className={styles.patientCard}>
          <div className={styles.patientCardIcon}><CalendarDays size={23} /></div>
          <div className={styles.patientCardCopy}>
            <span>FOR PATIENTS</span>
            <h2>Looking for a doctor?</h2>
            <p>Browse available doctors across CareBase hospitals, check appointment times, and book with a private appointment code.</p>
          </div>
          <div className={styles.patientCardActions}>
            <Link className={styles.buttonPrimary} to="/book-appointment">Find a doctor <ArrowRight size={17} /></Link>
            <Link className={styles.patientLookupLink} to="/my-appointments">Already booked? View appointment</Link>
          </div>
        </div>
      </section>

      <section className={styles.darkSection} id="security">
        <div className={`${styles.darkHeader} ${styles.reveal}`} data-reveal>
          <p className={styles.sectionLabel}>THE CAREBASE FOUNDATION</p>
          <h2>Technology that supports the teams behind care.</h2>
          <p>Bring essential hospital workflows together while keeping staff access aligned with their assigned responsibilities.</p>
        </div>
        <div className={styles.featureGrid}>
          {platformFeatures.map(({ icon: Icon, title, detail }, index) => (
            <article className={`${styles.featureCard} ${styles.reveal} ${revealDelays[index] ?? ""}`} data-reveal key={title}>
              <span className={styles.featureIcon}><Icon size={23} /></span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.footerCta}>
        <div className={`${styles.ctaContent} ${styles.reveal}`} data-reveal>
          <p className={styles.sectionLabel}>GET STARTED WITH CAREBASE</p>
          <h2>Bring your hospital’s work together.</h2>
          <p>Create an account, set up your hospital profile, and submit it for approval.</p>
          <div className={styles.ctaActions}>
            <Link className={styles.buttonPrimary} to="/signup">Create a hospital workspace <ArrowRight size={18} /></Link>
            <Link className={styles.ctaPatientLink} to="/book-appointment">Looking for a doctor? Book as a patient</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Link to="/">
            <img src={FooterLogo} alt="CareBase" /></Link>
            <p>Tools for the people and workflows that keep hospitals moving.</p>
          </div>
          <div className={styles.footerLinks} aria-label="Footer navigation">
            <a href="#platform">Platform</a>
            <a href="#workflows">Workflows</a>
            <a href="#security">Security</a>
            <Link to="/book-appointment">Book an appointment</Link>
            <Link to="/my-appointments">View my appointment</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create account</Link>
          </div>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} CareBase</span><span>Hospital management workspace</span></div>
      </footer>
    </main>
    </>
  );
}
