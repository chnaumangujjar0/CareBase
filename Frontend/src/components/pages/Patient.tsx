import { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Spin,
} from "antd";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardPlus,
  Download,
  HeartPulse,
  Pencil,
  Printer,
  Search,
  UserPlus,
} from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  CreatePatientMedicalDataPayload,
  CreatePatientPayload,
  PatientDetail,
  PatientMedicalData,
  PatientOption,
} from "../../types/global.types";
import { addPatientMedicalData, createPatient, getPatient, getPatients, updatePatient } from "../../services/api";
import "../../styles/patient.scss";

type MetricKey = Exclude<keyof CreatePatientMedicalDataPayload, "recordedAt" | "note" | "allergies" | "chronicConditions" | "pastSurgeries">;

const measurementFields: { key: MetricKey; label: string; unit: string; step?: number }[] = [
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "totalCholesterol", label: "Total cholesterol", unit: "mg/dL" },
  { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL", step: 0.1 },
  { key: "systolicBloodPressure", label: "Systolic pressure", unit: "mmHg" },
  { key: "diastolicBloodPressure", label: "Diastolic pressure", unit: "mmHg" },
  { key: "bloodGlucose", label: "Blood glucose", unit: "mg/dL" },
  { key: "whiteBloodCellCount", label: "White blood cells", unit: "/mm³" },
  { key: "bodyMassIndex", label: "Body mass index", unit: "kg/m²", step: 0.1 },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min" },
  { key: "plateletCount", label: "Platelet count", unit: "/mm³" },
];

const dateLabel = (date: string) => dayjs(date).format("MMMM D, YYYY");
const timeLabel = (date: string) => dayjs(date).format("h:mm A");

const initials = (patient: Pick<PatientOption, "firstName" | "lastName">) =>
  `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();

function TrendSparkline({ values }: { values: (number | null | undefined)[] }) {
  const points = values.filter((value): value is number => value !== null && value !== undefined);
  if (points.length < 2) {
    return <span className="patient-trend-empty" aria-hidden="true">—</span>;
  }

  return (
    <div className="patient-sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points.map((value, index) => ({ index, value }))} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
          <Line
            dataKey="value"
            type="monotone"
            stroke="currentColor"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function BloodPressureChart({ records }: { records: PatientMedicalData[] }) {
  const data = records
    .filter((record) => record.systolicBloodPressure !== null && record.diastolicBloodPressure !== null)
    .slice(0, 10)
    .reverse();

  if (data.length === 0) {
    return <div className="patient-chart-empty">No blood pressure history recorded.</div>;
  }

  const chartData = data.map((record) => ({
    date: dayjs(record.recordedAt).format("MMM D"),
    systolic: record.systolicBloodPressure,
    diastolic: record.diastolicBloodPressure,
  }));

  return (
    <div className="patient-bp-chart-wrap" role="img" aria-label="Blood pressure history chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--patient-chart-grid)" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            interval={data.length > 5 ? Math.floor((data.length - 1) / 2) : 0}
            tick={{ fill: "var(--patient-chart-label)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={["dataMin - 10", "dataMax + 10"]}
            tick={{ fill: "var(--patient-chart-label)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--patient-chart-grid)", fontSize: 12 }} />
          <Line
            dataKey="systolic"
            name="Systolic"
            type="monotone"
            stroke="var(--patient-chart-systolic)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={true}
          />
          <Line
            dataKey="diastolic"
            name="Diastolic"
            type="monotone"
            stroke="var(--patient-chart-diastolic)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Patient() {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [exportLimit, setExportLimit] = useState<number | "all">(100);
  const [exporting, setExporting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [createPatientForm, setCreatePatientForm] = useState<CreatePatientPayload>({
    mrn: "",
    firstName: "",
    lastName: "",
    dob: "",
    address: "",
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [savingMedicalData, setSavingMedicalData] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [recordedAt, setRecordedAt] = useState<Dayjs | null>(dayjs());
  const [medicalValues, setMedicalValues] = useState<CreatePatientMedicalDataPayload>({});

  useEffect(() => {
    if (!user?.tenantId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setListLoading(true);
      getPatients({
        search: search.trim() || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter,
        page,
        limit: 30,
      })
        .then((response) => {
          if (!active) return;
          setPatients(response.items);
          setTotal(response.total);
          setTotalPages(response.totalPages);
          setSelectedPatientId((current) =>
            response.items.some((item) => item.id === current) ? current : response.items[0]?.id,
          );
        })
        .catch(() => {
          if (active) toast.error("Could not load patients");
        })
        .finally(() => {
          if (active) setListLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeFilter, page, search, user?.tenantId]);

  useEffect(() => {
    if (!selectedPatientId || !user?.tenantId) {
      queueMicrotask(() => setPatient(null));
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => setDetailLoading(true), 0);
    getPatient(selectedPatientId)
      .then((data) => {
        if (active) setPatient(data);
      })
      .catch(() => {
        if (active) toast.error("Could not load patient details");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {     active = false;
    window.clearTimeout(timer); };
  }, [selectedPatientId, user?.tenantId]);

  const history = patient?.MedicalData ?? [];
  const latest = history[0];
  const metricCards = [
    { label: "Heart rate", value: latest?.heartRate, unit: "bpm", key: "heartRate" as const },
    { label: "Cholesterol", value: latest?.totalCholesterol, unit: "mg/dL", key: "totalCholesterol" as const },
    { label: "Hemoglobin", value: latest?.hemoglobin, unit: "g/dL", key: "hemoglobin" as const },
    {
      label: "Blood pressure",
      value: latest?.systolicBloodPressure != null && latest.diastolicBloodPressure != null
        ? `${latest.systolicBloodPressure}/${latest.diastolicBloodPressure}`
        : null,
      unit: "mmHg",
      key: "systolicBloodPressure" as const,
    },
    { label: "Glucose", value: latest?.bloodGlucose, unit: "mg/dL", key: "bloodGlucose" as const },
    { label: "White blood cells", value: latest?.whiteBloodCellCount, unit: "/mm³", key: "whiteBloodCellCount" as const },
    { label: "Body mass index", value: latest?.bodyMassIndex, unit: "kg/m²", key: "bodyMassIndex" as const },
    { label: "Respiratory", value: latest?.respiratoryRate, unit: "/min", key: "respiratoryRate" as const },
    { label: "Platelet count", value: latest?.plateletCount, unit: "/mm³", key: "plateletCount" as const },
  ];

  const resetMedicalForm = () => {
    setRecordedAt(dayjs());
    setMedicalValues({});
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setCreatePatientForm({ mrn: "", firstName: "", lastName: "", dob: "" });
  };

  const saveNewPatient = async () => {

    const payload = {
      ...createPatientForm,
      mrn: createPatientForm.mrn.trim(),
      firstName: createPatientForm.firstName.trim(),
      lastName: createPatientForm.lastName.trim(),
      contactPhone: createPatientForm.contactPhone?.trim(),
      contactEmail: createPatientForm.contactEmail?.trim() || null,
      address: createPatientForm.address?.trim() || null,
    };
    if (!payload.mrn || !payload.firstName || !payload.lastName || !payload.dob || !payload.contactPhone || !payload.gender || !payload.address) {
      toast.error("All Fields are required");
      return;
    }

    setSavingPatient(true);
    try {
      const createdPatient = await createPatient(payload);
      setPatients([createdPatient]);
      setSelectedPatientId(createdPatient.id);
      setSearch(createdPatient.mrn);
      setPage(1);
      setActiveFilter("all");
      closeCreateForm();
      toast.success("Patient added");
    } catch (error: unknown) {
      const response = error as { response?: { data?: { message?: string } } };
      toast.error(response.response?.data?.message || "Could not add patient");
    } finally {
      setSavingPatient(false);
    }
  };

  const openProfileForm = () => {
    if (!patient) return;
    setInsuranceProvider(patient.insuranceProvider ?? "");
    setInsurancePolicyNumber(patient.insurancePolicyNumber ?? "");
    setShowProfileForm(true);
  };

  const savePatientProfile = async () => {
    if (!patient) return;
    setSavingProfile(true);
    try {
      await updatePatient(patient.id, {
        insuranceProvider: insuranceProvider.trim() || null,
        insurancePolicyNumber: insurancePolicyNumber.trim() || null,
      });
      setPatient(await getPatient(patient.id));
      setShowProfileForm(false);
      toast.success("Patient profile updated");
    } catch (error: unknown) {
      const response = error as { response?: { data?: { message?: string } } };
      toast.error(response.response?.data?.message || "Could not update patient profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveMedicalData = async () => {
    if (!patient) return;
    const hasSystolic = medicalValues.systolicBloodPressure !== undefined;
    const hasDiastolic = medicalValues.diastolicBloodPressure !== undefined;
    if (hasSystolic !== hasDiastolic) {
      toast.error("Enter both systolic and diastolic blood pressure");
      return;
    }
    const measurements = medicalValues;
    if (Object.values(measurements).every((value) => value === undefined || value === "")) {
      toast.error("Enter at least one measurement or note");
      return;
    }

    setSavingMedicalData(true);
    try {
      await addPatientMedicalData(patient.id, {
        ...measurements,
        recordedAt: recordedAt?.toISOString(),
      });
      const updatedPatient = await getPatient(patient.id);
      setPatient(updatedPatient);
      setShowMedicalForm(false);
      resetMedicalForm();
      toast.success("Medical measurements recorded");
    } catch (error: unknown) {
      const response = error as { response?: { data?: { message?: string } } };
      toast.error(response.response?.data?.message || "Could not save measurements");
    } finally {
      setSavingMedicalData(false);
    }
  };

  const patientDoctor = patient?.Appointment[0]?.DoctorProfile;
  const patientNote = latest?.note;

  const exportPatients = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const filters = {
        search: search.trim() || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter,
      };
      const firstPage = await getPatients({ ...filters, page: 1, limit: 100 });
      const targetCount = exportLimit === "all" ? firstPage.total : Math.min(exportLimit, firstPage.total);
      const rows = [...firstPage.items].slice(0, targetCount);
      const pagesNeeded = Math.ceil(targetCount / 100);
      for (let nextPage = 2; nextPage <= pagesNeeded; nextPage += 1) {
        const response = await getPatients({ ...filters, page: nextPage, limit: 100 });
        rows.push(...response.items.slice(0, targetCount - rows.length));
      }
      if (rows.length === 0) {
        toast.info("There are no patients to export with these filters.");
        return;
      }
      const columns = ["MRN", "First name", "Last name", "Date of birth", "Gender", "Phone", "Email", "Address", "Insurance provider", "Insurance policy number", "Status"];
      const csvCell = (value: unknown) => {
        let text = value == null ? "" : String(value);
        if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const csvRows = rows.map((item) => [
        item.mrn,
        item.firstName,
        item.lastName,
        item.dob ? dayjs(item.dob).format("YYYY-MM-DD") : "",
        item.gender,
        item.contactPhone,
        item.contactEmail,
        item.address,
        item.insuranceProvider,
        item.insurancePolicyNumber,
        item.isActive ? "Active" : "Inactive",
      ]);
      const csv = [columns, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `carebase-patients-${dayjs().format("YYYY-MM-DD")}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Exported ${rows.length} patient${rows.length === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Could not export patients");
    } finally {
      setExporting(false);
    }
  };

  const printPatientRecord = () => {
    if (!patient || !patient.isActive) return;
    document.body.classList.add("print-patient-record-mode");
    const cleanup = () => document.body.classList.remove("print-patient-record-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 60_000);
  };

  return (
    <main className="patient-page">
      <aside className="patient-list-panel">
        <div className="patient-list-heading">
          <div>
            <p className="patient-eyebrow">Directory</p>
            <h1>Patients</h1>
          </div>
          <div className="patient-list-heading-actions">
            <span className="patient-count">{total}</span>
            <Button
              type="primary"
              size="small"
              icon={<UserPlus size={15} />}
              aria-label="Add patient"
              title="Add patient"
              onClick={() => setShowCreateForm(true)}
            />
          </div>
        </div>

        <div className="patient-export-controls">
          <Select
            aria-label="Patient export row limit"
            className="patient-export-limit"
            value={exportLimit}
            onChange={setExportLimit}
            options={[
              { value: 30, label: "30 rows" },
              { value: 100, label: "100 rows" },
              { value: 250, label: "250 rows" },
              { value: 500, label: "500 rows" },
              { value: "all", label: "All matching" },
            ]}
          />
          <Button
            icon={<Download size={14} />}
            aria-label="Export patient list as CSV"
            title="Export patient list as CSV"
            loading={exporting}
            disabled={total === 0}
            onClick={() => void exportPatients()}
          >Export CSV</Button>
        </div>

        <div className="patient-list-controls">
          <Input
            allowClear
            prefix={<Search size={15} />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or MRN"
          />
          <Select
            value={activeFilter}
            onChange={(value) => {
              setActiveFilter(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All patients" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>

        <div className="patient-list" aria-label="Patient list">
          {listLoading ? (
            <div className="patient-list-state"><Spin /></div>
          ) : patients.length === 0 ? (
            <div className="patient-list-state"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No patients found" /></div>
          ) : patients.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`patient-list-item ${selectedPatientId === item.id ? "is-selected" : ""}`}
              onClick={() => setSelectedPatientId(item.id)}
            >
              <span className="patient-avatar">{initials(item)}</span>
              <span className="patient-list-copy">
                <strong>{item.firstName} {item.lastName}</strong>
                <span>MRN {item.mrn}</span>
              </span>
              <span className="patient-list-date">{dayjs(item.dob).format("MMM D, YYYY")}</span>
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={30}
            showSizeChanger={false}
            onChange={setPage}
          />
        )}
      </aside>

      <Modal
        title="Add patient"
        open={showCreateForm}
        onCancel={closeCreateForm}
        onOk={() => void saveNewPatient()}
        okText="Add patient"
        confirmLoading={savingPatient}
        destroyOnHidden
        zIndex={1100}
      >
        <div className="patient-profile-form">
          <label htmlFor="new-patient-mrn">Medical record number</label>
          <Input
            id="new-patient-mrn"
            maxLength={64}
            value={createPatientForm.mrn}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, mrn: event.target.value }))}
          />
          <label htmlFor="new-patient-first-name">First name</label>
          <Input
            id="new-patient-first-name"
            maxLength={100}
            value={createPatientForm.firstName}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, firstName: event.target.value }))}
          />
          <label htmlFor="new-patient-last-name">Last name</label>
          <Input
            id="new-patient-last-name"
            maxLength={100}
            value={createPatientForm.lastName}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, lastName: event.target.value }))}
          />
          <label htmlFor="new-patient-dob">Date of birth</label>
          <DatePicker
            id="new-patient-dob"
            value={createPatientForm.dob ? dayjs(createPatientForm.dob) : null}
            onChange={(date) => setCreatePatientForm((current) => ({ ...current, dob: date?.format("YYYY-MM-DD") ?? "" }))}
            disabledDate={(date) => date.isAfter(dayjs(), "day")}
            className="w-100"
          />
          <label htmlFor="new-patient-gender">Gender</label>
          <Select
            id="new-patient-gender"
            allowClear
            value={createPatientForm.gender ?? undefined}
            onChange={(gender) => setCreatePatientForm((current) => ({ ...current, gender: gender ?? null }))}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other" },
            ]}
          />
          <label htmlFor="new-patient-phone">Phone</label>
          <Input
            id="new-patient-phone"
            maxLength={32}
            value={createPatientForm.contactPhone ?? ""}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, contactPhone: event.target.value }))}
          />
          <label htmlFor="new-patient-email">Email (optional)</label>
          <Input
            id="new-patient-email"
            type="email"
            maxLength={254}
            value={createPatientForm.contactEmail ?? ""}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, contactEmail: event.target.value }))}
          />
          <label htmlFor="new-patient-address">Address (optional)</label>
          <Input
            id="new-patient-address"
            maxLength={254}
            value={createPatientForm.address ?? ""}
            onChange={(event) => setCreatePatientForm((current) => ({ ...current, address: event.target.value }))}
          />
        </div>
      </Modal>

      <section className="patient-main-column">
        {detailLoading ? (
          <div className="patient-main-loading"><Spin size="large" /></div>
        ) : patient ? (
          <>
            <section className="patient-medical-panel">
              <div className="patient-section-heading">
                <div>
                  <p className="patient-eyebrow">Clinical record</p>
                  <h2>Medical history</h2>
                </div>
                <div className="patient-heading-actions">
                  <Button
                    className="patient-print-action"
                    icon={<Printer size={15} />}
                    disabled={!patient.isActive}
                    title={patient.isActive ? "Print active patient record" : "Only active patient records can be printed"}
                    onClick={printPatientRecord}
                  >
                    Print record
                  </Button>
                  <span className="patient-check-date">
                    {latest ? `Last check-up: ${dateLabel(latest.recordedAt)}` : "No measurements recorded"}
                  </span>
                  <Button
                    icon={<CalendarPlus size={15} />}
                    onClick={() => navigate("/appointments", { state: { patient } })}
                  >
                    New appointment
                  </Button>
                  <Button type="primary" icon={<ClipboardPlus size={15} />} onClick={() => setShowMedicalForm(true)}>
                    Add measurements
                  </Button>
                </div>
              </div>

              <div className="patient-metric-grid">
                {metricCards.map((metric) => {
                  const values = history.slice().reverse().map((record) => record[metric.key]);
                  return (
                    <article className="patient-metric" key={metric.label}>
                      <div className="patient-metric-copy">
                        <span>{metric.label}</span>
                        <strong>
                          {metric.value == null ? "—" : typeof metric.value === "number" ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : metric.value}
                          {metric.value != null && <small>{metric.unit}</small>}
                        </strong>
                      </div>
                      <TrendSparkline values={values} />
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="patient-chart-panel">
              <div className="patient-section-heading">
                <div>
                  <h2>Blood pressure</h2>
                  <p>Recorded systolic and diastolic readings</p>
                </div>
                <div className="patient-chart-legend">
                  <span><i className="legend-systolic" /> Systolic</span>
                  <span><i className="legend-diastolic" /> Diastolic</span>
                </div>
              </div>
              <BloodPressureChart records={history} />
            </section>
          </>
        ) : (
          <div className="patient-main-loading"><Empty description="Select a patient to view their medical record" /></div>
        )}
      </section>

      <aside className="patient-right-column">
        {detailLoading ? (
          <section className="patient-side-panel patient-side-loading"><Spin /></section>
        ) : patient ? (
          <>
            <section className="patient-side-panel patient-profile-panel">
              <div className="patient-side-heading">
                <h2>Patient profile</h2>
                <Button
                  type="text"
                  icon={<Pencil size={16} />}
                  aria-label="Edit patient insurance details"
                  onClick={openProfileForm}
                />
              </div>
              <div className="patient-profile-identity">
                <span className="patient-avatar patient-avatar-large">{initials(patient)}</span>
                <strong>{patient.firstName} {patient.lastName}</strong>
                <span>MRN {patient.mrn}</span>
              </div>
              <dl className="patient-profile-details">
                <div><dt>Date of birth</dt><dd>{dateLabel(patient.dob)}</dd></div>
                <div><dt>Gender</dt><dd>{patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : "Not recorded"}</dd></div>
                <div><dt>Phone</dt><dd>{patient.contactPhone || "Not recorded"}</dd></div>
                <div><dt>Email</dt><dd>{patient.contactEmail || "Not recorded"}</dd></div>
                <div><dt>Address</dt><dd>{patient.address || "Not recorded"}</dd></div>
                <div><dt>Insurance</dt><dd>{patient.insuranceProvider || "Not recorded"}</dd></div>
                <div><dt>Policy number</dt><dd>{patient.insurancePolicyNumber || "Not recorded"}</dd></div>
                {patientDoctor && <div><dt>Doctor</dt><dd>{patientDoctor.User.name}</dd></div>}
                <div><dt>Allergies</dt><dd>{latest?.allergies || "Not recorded"}</dd></div>
                <div><dt>Chronic conditions</dt><dd>{latest?.chronicConditions || "Not recorded"}</dd></div>
                <div><dt>Past surgeries</dt><dd>{latest?.pastSurgeries || "Not recorded"}</dd></div>
              </dl>
            </section>

            <section className="patient-side-panel">
              <div className="patient-side-heading">
                <h2>Upcoming appointments</h2>
                <CalendarDays size={17} />
              </div>
              {patient.Appointment.length > 0 ? (
                <ul className="patient-upcoming-list">
                  {patient.Appointment.map((appointment) => (
                    <li key={appointment.id}>
                      <strong>{appointment.Department.name}</strong>
                      <span>{appointment.DoctorProfile.User.name}</span>
                      <time>{dateLabel(appointment.scheduledAt)} · {timeLabel(appointment.scheduledAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="patient-side-empty">No upcoming appointments</p>
              )}
            </section>

            <section className="patient-side-panel patient-note-panel">
              <div className="patient-side-heading">
                <h2>Patient note</h2>
                <span>{latest?.recordedAt ? dateLabel(latest.recordedAt) : ""}</span>
              </div>
              <p>{patientNote || "No clinical note recorded."}</p>
            </section>
          </>
        ) : (
          <section className="patient-side-panel patient-side-empty-state">
            <HeartPulse size={20} />
            <p>Patient details will appear here.</p>
          </section>
        )}
      </aside>

      {patient && (
        <section className="patient-print-record" aria-hidden="true">
          <header className="patient-print-header">
            <div><span>CAREBASE · PATIENT RECORD</span><h1>{patient.firstName} {patient.lastName}</h1></div>
            <div><strong>MRN {patient.mrn}</strong><span>Printed {dayjs().format("MMMM D, YYYY h:mm A")}</span></div>
          </header>
          <section className="patient-print-section">
            <h2>Patient details</h2>
            <dl className="patient-print-details">
              <div><dt>Status</dt><dd>{patient.isActive ? "Active" : "Inactive"}</dd></div>
              <div><dt>Date of birth</dt><dd>{dateLabel(patient.dob)}</dd></div>
              <div><dt>Gender</dt><dd>{patient.gender ?? "Not recorded"}</dd></div>
              <div><dt>Phone</dt><dd>{patient.contactPhone || "Not recorded"}</dd></div>
              <div><dt>Email</dt><dd>{patient.contactEmail || "Not recorded"}</dd></div>
              <div><dt>Address</dt><dd>{patient.address || "Not recorded"}</dd></div>
              <div><dt>Insurance</dt><dd>{patient.insuranceProvider || "Not recorded"}</dd></div>
              <div><dt>Policy number</dt><dd>{patient.insurancePolicyNumber || "Not recorded"}</dd></div>
              <div><dt>Emergency contact</dt><dd>{patient.emergencyContactName || "Not recorded"}{patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ""}</dd></div>
              <div><dt>Primary doctor</dt><dd>{patientDoctor?.User.name || "Not recorded"}</dd></div>
            </dl>
          </section>
          <section className="patient-print-section">
            <h2>Medical records ({history.length})</h2>
            {history.length ? history.map((record) => (
              <article className="patient-print-medical-entry" key={record.id}>
                <h3>{dateLabel(record.recordedAt)} · {timeLabel(record.recordedAt)}</h3>
                <dl className="patient-print-details">
                  {measurementFields.map(({ key, label, unit }) => record[key] != null && <div key={key}><dt>{label}</dt><dd>{record[key]} {unit}</dd></div>)}
                  {record.allergies && <div><dt>Allergies</dt><dd>{record.allergies}</dd></div>}
                  {record.chronicConditions && <div><dt>Chronic conditions</dt><dd>{record.chronicConditions}</dd></div>}
                  {record.pastSurgeries && <div><dt>Past surgeries</dt><dd>{record.pastSurgeries}</dd></div>}
                  {record.note && <div><dt>Clinical note</dt><dd>{record.note}</dd></div>}
                </dl>
              </article>
            )) : <p>No medical records recorded.</p>}
          </section>
          <section className="patient-print-section">
            <h2>Upcoming appointments</h2>
            {patient.Appointment.length ? patient.Appointment.map((appointment) => (
              <p key={appointment.id}>{dateLabel(appointment.scheduledAt)} · {timeLabel(appointment.scheduledAt)} — {appointment.Department.name}, Dr. {appointment.DoctorProfile.User.name}</p>
            )) : <p>No upcoming appointments.</p>}
          </section>
        </section>
      )}

      <Modal
        title="Edit patient insurance"
        open={showProfileForm}
        onCancel={() => setShowProfileForm(false)}
        onOk={() => void savePatientProfile()}
        okText="Save profile"
        confirmLoading={savingProfile}
        destroyOnHidden
        zIndex={1100}
      >
        <div className="patient-profile-form">
          <label htmlFor="insurance-provider">Insurance provider</label>
          <Input
            id="insurance-provider"
            maxLength={160}
            value={insuranceProvider}
            onChange={(event) => setInsuranceProvider(event.target.value)}
          />
          <label htmlFor="insurance-policy-number">Policy number</label>
          <Input
            id="insurance-policy-number"
            maxLength={120}
            value={insurancePolicyNumber}
            onChange={(event) => setInsurancePolicyNumber(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="Record medical measurements"
        open={showMedicalForm}
        onCancel={() => {
          setShowMedicalForm(false);
          resetMedicalForm();
        }}
        onOk={() => void saveMedicalData()}
        okText="Save measurements"
        confirmLoading={savingMedicalData}
        destroyOnHidden
        zIndex={1100}
      >
        <div className="patient-measurement-form">
          <label htmlFor="measurement-date">Recorded at</label>
          <DatePicker
            id="measurement-date"
            showTime
            value={recordedAt}
            onChange={setRecordedAt}
            disabledDate={(date) => date.isAfter(dayjs(), "day")}
            className="w-100"
          />
          <div className="patient-measurement-fields">
            {measurementFields.map((field) => (
              <label key={field.key}>
                <span>{field.label} <small>{field.unit}</small></span>
                <InputNumber
                  min={0}
                  step={field.step ?? 1}
                  value={medicalValues[field.key]}
                  onChange={(value) => setMedicalValues((current) => ({
                    ...current,
                    [field.key]: value == null ? undefined : Number(value),
                  }))}
                  className="w-100"
                />
              </label>
            ))}
          </div>
          <div className="patient-history-fields">
            <label htmlFor="medical-allergies">Allergies</label>
            <Input.TextArea
              id="medical-allergies"
              rows={2}
              maxLength={2000}
              value={medicalValues.allergies ?? ""}
              onChange={(event) => setMedicalValues((current) => ({ ...current, allergies: event.target.value }))}
            />
            <label htmlFor="medical-chronic-conditions">Chronic conditions</label>
            <Input.TextArea
              id="medical-chronic-conditions"
              rows={2}
              maxLength={2000}
              value={medicalValues.chronicConditions ?? ""}
              onChange={(event) => setMedicalValues((current) => ({ ...current, chronicConditions: event.target.value }))}
            />
            <label htmlFor="medical-past-surgeries">Past surgeries</label>
            <Input.TextArea
              id="medical-past-surgeries"
              rows={2}
              maxLength={2000}
              value={medicalValues.pastSurgeries ?? ""}
              onChange={(event) => setMedicalValues((current) => ({ ...current, pastSurgeries: event.target.value }))}
            />
          </div>
          <label htmlFor="medical-note">Clinical note</label>
          <Input.TextArea
            id="medical-note"
            rows={3}
            maxLength={4000}
            showCount
            value={medicalValues.note ?? ""}
            onChange={(event) => setMedicalValues((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional note for this measurement entry"
          />
        </div>
      </Modal>
    </main>
  );
}

export default Patient;
