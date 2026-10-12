import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  ConfigProvider
} from "antd";
import type { TableProps } from "antd";
import { Activity, BedDouble, ClipboardPlus, RefreshCw, Stethoscope } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router";
import { toast } from "react-toastify";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  AppointmentRecord,
  ClinicalEncounter,
  ClinicalEncounterDetail,
  ClinicalMedicine,
  Department,
  PatientOption,
} from "../../types/global.types";
import {
  assignClinicalAdmissionBed,
  assignClinicalEncounterBed,
  cancelClinicalPrescription,
  createClinicalAdmission,
  createClinicalConsultation,
  createClinicalEncounter,
  createClinicalPrescription,
  createClinicalSurgery,
  dischargeClinicalAdmission,
  getApiErrorMessage,
  getAppointmentOptions,
  getAppointments,
  getClinicalAvailableBeds,
  getClinicalEncounter,
  getClinicalEncounters,
  getClinicalMedicines,
  getClinicalTheatres,
  getClinicalSurgeryTeamOptions,
  getDepartments,
  getPatients,
  transferClinicalAdmissionBed,
  transferClinicalEncounterBed,
  releaseClinicalEncounterBed,
  updateClinicalEncounter,
  updateClinicalSurgery,
} from "../../services/api";

const { Title, Text } = Typography;

type Action =
  | "checkin"
  | "consultation"
  | "prescription"
  | "admission"
  | "assignBed"
  | "transferBed"
  | "releaseBed"
  | "discharge"
  | "surgery"
  | "updateSurgery"
  | "closeEncounter";

interface ClinicalFormValues {
  appointmentId?: string;
  patientId?: string;
  departmentId?: string;
  doctorId?: string;
  source?: "walk_in" | "emergency" | "referral";
  type?: "outpatient" | "inpatient" | "emergency";
  triageLevel?: "critical" | "urgent" | "normal";
  arrivalMode?: "walk_in" | "ambulance" | "referral";
  chiefComplaint?: string;
  kind?: "initial" | "ward_round" | "pre_operative";
  findings?: string;
  diagnosis?: string;
  notes?: string;
  followUpDate?: Dayjs;
  medicineId?: string;
  prescriptionItems?: Array<{
    medicineId?: string;
    dose?: string;
    frequency?: string;
    durationDays?: number;
    instructions?: string;
  }>;
  reason?: string;
  admissionDiagnosis?: string;
  bedId?: string;
  targetBedId?: string;
  dischargeType?: "routine" | "against_medical_advice" | "transferred" | "deceased";
  finalDiagnosis?: string;
  proceduresPerformed?: string;
  courseInHospital?: string;
  conditionAtDischarge?: string;
  followUpInstructions?: string;
  procedureName?: string;
  scheduledAt?: Dayjs;
  durationMinutes?: number;
  theatreId?: string;
  surgeonId?: string;
  anesthesiaType?: "general" | "regional" | "local" | "sedation";
  surgeryTeam?: Array<{ userId?: string; role?: "assistant_surgeon" | "anesthetist" | "scrub_nurse" | "circulating_nurse" }>;
  preOpNotes?: string;
  surgeryId?: string;
  surgeryStatus?: "in_progress" | "completed" | "cancelled" | "postponed" | "scheduled";
  outcomeNotes?: string;
  disposition?: "discharged_home" | "admitted" | "transferred" | "referred_out" | "left_without_being_seen" | "deceased";
}

const statusColor: Record<ClinicalEncounter["status"], string> = {
  waiting: "gold",
  in_progress: "processing",
  closed: "default",
};

const triageColor: Record<NonNullable<ClinicalEncounter["triageLevel"]>, string> = {
  critical: "red",
  urgent: "orange",
  normal: "green",
};

const actionTitles: Record<Action, string> = {
  checkin: "Check in patient",
  consultation: "Record consultation",
  prescription: "Create prescription",
  admission: "Admit patient",
  assignBed: "Assign bed",
  transferBed: "Transfer bed",
  releaseBed: "Release emergency bed",
  discharge: "Discharge patient",
  surgery: "Schedule surgery",
  updateSurgery: "Update surgery",
  closeEncounter: "Close encounter",
};

const errorMessage = (error: unknown, fallback: string) => getApiErrorMessage(error, fallback);

const themeConfig = {
  token: {
    colorPrimary: '#0F766E',
    colorInfo: '#0284C7',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorTextBase: '#1E293B',
    colorBgLayout: '#F1F5F9',
    borderRadius: 8,
    fontFamily: '"Inter", sans-serif',
    boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
  },
};
export default function ClinicalDesk() {
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [searchParams] = useSearchParams();
  const requestedEncounterId = searchParams.get("encounterId") ?? undefined;
  const tenantId = user?.tenantId;
  const hasPermission = (permission: string) =>
    Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission));
  const canWrite = hasPermission("clinical:encounters:write");
  const canReadQueue = hasPermission("clinical:encounters:read");
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [loadedDetail, setLoadedDetail] = useState<ClinicalEncounterDetail | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Awaited<ReturnType<typeof getAppointmentOptions>>["doctors"]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [medicines, setMedicines] = useState<ClinicalMedicine[]>([]);
  const [theatres, setTheatres] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [surgeryTeamOptions, setSurgeryTeamOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [availableBeds, setAvailableBeds] = useState<Awaited<ReturnType<typeof getClinicalAvailableBeds>>>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [form] = Form.useForm<ClinicalFormValues>();
  const selectedAppointmentId = Form.useWatch("appointmentId", form);
  const selectedSurgeryId = Form.useWatch("surgeryId", form);
  const selectedSurgeryStatus = Form.useWatch("surgeryStatus", form);
  const detail = selectedId === loadedDetail?.id ? loadedDetail : null;
  const selectedSurgery = detail?.SurgeryCase.find((surgery) => surgery.id === selectedSurgeryId);
  const allowedSurgeryStatuses: Record<
    NonNullable<ClinicalFormValues["surgeryStatus"]>,
    NonNullable<ClinicalFormValues["surgeryStatus"]>[]
  > = {
    scheduled: ["in_progress", "cancelled", "postponed"],
    in_progress: ["completed"],
    postponed: ["scheduled", "cancelled"],
    completed: [],
    cancelled: [],
  };

  const loadEncounters = useCallback(async () => {
    if (!tenantId || !canReadQueue) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getClinicalEncounters({ page: queuePage, limit: 25 });
      setEncounters(result.items);
      setQueueTotal(result.pagination.total);
      setSelectedId((current) =>
        requestedEncounterId
          ? requestedEncounterId
          : current && result.items.some((item) => item.id === current)
          ? current
          : result.items[0]?.id,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not load the clinical queue"));
    } finally {
      setLoading(false);
    }
  }, [canReadQueue, queuePage, requestedEncounterId, tenantId]);

  const loadOptions = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [departmentRows, doctorOptions, patientResponse] = await Promise.all([
        getDepartments(tenantId),
        getAppointmentOptions(),
        getPatients({ page: 1, limit: 100, isActive: "true" }),
      ]);
      setDepartments((departmentRows as Department[]).filter((department) => department.isActive));
      setDoctors(doctorOptions.doctors);
      setPatients(patientResponse.items);
    } catch (error) {
      toast.error(errorMessage(error, "Could not load clinical form options"));
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEncounters();
      void loadOptions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEncounters, loadOptions]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setDetailLoading(true);
      getClinicalEncounter(selectedId)
        .then((result) => {
          if (active) setLoadedDetail(result);
        })
        .catch((error) => {
          if (active) toast.error(errorMessage(error, "Could not load encounter details"));
        })
        .finally(() => {
          if (active) setDetailLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedId]);

  const reload = async () => {
    await loadEncounters();
    if (selectedId) {
      try {
        setLoadedDetail(await getClinicalEncounter(selectedId));
      } catch (error) {
        toast.error(errorMessage(error, "Could not refresh encounter"));
      }
    }
  };

  const openAction = async (nextAction: Action) => {
    form.resetFields();
    setAction(nextAction);
    if (nextAction === "checkin") {
      try {
        const bookedAppointments = await getAppointments({ status: "booked", onlyNotCheckedIn: true });
        setAppointments(bookedAppointments);
      } catch (error) {
        toast.error(errorMessage(error, "Could not load booked appointments"));
      }
    }
    if (nextAction === "prescription") {
      try {
        setMedicines(await getClinicalMedicines());
      } catch (error) {
        toast.error(errorMessage(error, "Could not load the hospital medicine list"));
      }
    }
    if (nextAction === "assignBed" || nextAction === "transferBed") {
      try {
        setAvailableBeds(await getClinicalAvailableBeds());
      } catch (error) {
        toast.error(errorMessage(error, "Could not load available beds"));
      }
    }
    if (nextAction === "surgery") {
      try {
        const [activeTheatres, teamOptions] = await Promise.all([
          getClinicalTheatres(),
          getClinicalSurgeryTeamOptions(),
        ]);
        setTheatres(activeTheatres);
        setSurgeryTeamOptions(teamOptions);
      } catch (error) {
        toast.error(errorMessage(error, "Could not load operating theatres"));
      }
    }
  };

  const finishAction = async (values: ClinicalFormValues) => {
    if (action !== "checkin" && !detail) return;
    setSaving(true);
    try {
      if (action === "checkin") {
        const result = await createClinicalEncounter({
          ...(values.appointmentId ? { appointmentId: values.appointmentId } : {
            patientId: values.patientId,
            departmentId: values.departmentId,
            doctorId: values.doctorId || null,
          }),
          source: values.appointmentId ? "appointment" : values.source,
          type: !values.appointmentId && values.source === "emergency" ? "emergency" : values.type ?? "outpatient",
          chiefComplaint: values.chiefComplaint?.trim() || null,
          arrivalMode: values.arrivalMode ?? null,
          triageLevel: values.triageLevel ?? null,
        });
        setSelectedId(result.id);
        setQueuePage(1);
        toast.success(`Patient checked in. Queue number ${result.queueNumber ?? "assigned"}.`);
      } else if (action === "consultation") {
        await createClinicalConsultation(detail!.id, {
          kind: values.kind,
          findings: values.findings?.trim() || null,
          diagnosis: values.diagnosis?.trim() || null,
          notes: values.notes?.trim() || null,
          followUpDate: values.followUpDate?.format("YYYY-MM-DD") ?? null,
        });
        toast.success("Consultation saved");
      } else if (action === "prescription") {
        const items = (values.prescriptionItems ?? []).map((item) => ({
          medicineId: item.medicineId!,
          dose: item.dose!.trim(),
          frequency: item.frequency!.trim(),
          durationDays: item.durationDays ?? null,
          instructions: item.instructions?.trim() || null,
        }));
        await createClinicalPrescription(detail!.id, { notes: values.notes?.trim() || null, items });
        toast.success("Prescription saved");
      } else if (action === "admission") {
        await createClinicalAdmission(detail!.id, {
          reason: values.reason!.trim(),
          admissionDiagnosis: values.admissionDiagnosis?.trim() || null,
        });
        toast.success("Admission created");
      } else if (action === "assignBed") {
        const admissionId = detail!.Admission?.id;
        if (admissionId) {
          await assignClinicalAdmissionBed(admissionId, values.bedId!);
        } else {
          await assignClinicalEncounterBed(detail!.id, values.bedId!);
        }
        toast.success("Bed assigned");
      } else if (action === "transferBed") {
        const active = detail!.Admission?.BedAssignment.find((assignment) => !assignment.releasedAt);
        const emergencyActive = detail!.BedAssignment.find((assignment) => !assignment.releasedAt);
        const activeAssignment = active ?? emergencyActive;
        if (!activeAssignment) {
          throw new Error("There is no active bed assignment to transfer.");
        }
        if (detail!.Admission) {
          await transferClinicalAdmissionBed(detail!.Admission.id, activeAssignment.bedId, values.targetBedId!);
        } else {
          await transferClinicalEncounterBed(
            detail!.id,
            activeAssignment.bedId,
            values.targetBedId!,
          );
        }
        toast.success("Bed transfer completed");
      } else if (action === "releaseBed") {
        const assignment = detail!.BedAssignment.find((item) => !item.releasedAt);
        if (!assignment || detail!.Admission) {
          throw new Error("Only an active emergency bed assignment can be released here.");
        }
        await releaseClinicalEncounterBed(detail!.id, assignment.bedId);
        toast.success("Emergency bed released");
      } else if (action === "discharge") {
        if (!detail!.Admission) throw new Error("This encounter has no admission to discharge.");
        await dischargeClinicalAdmission(detail!.Admission.id, {
          dischargeType: values.dischargeType!,
          finalDiagnosis: values.finalDiagnosis?.trim() || null,
          proceduresPerformed: values.proceduresPerformed?.trim() || null,
          courseInHospital: values.courseInHospital?.trim() || null,
          conditionAtDischarge: values.conditionAtDischarge?.trim() || null,
          followUpInstructions: values.followUpInstructions?.trim() || null,
          followUpDate: values.followUpDate?.format("YYYY-MM-DD") ?? null,
        });
        toast.success("Patient discharged");
      } else if (action === "surgery") {
        await createClinicalSurgery(detail!.id, {
          procedureName: values.procedureName!.trim(),
          scheduledAt: values.scheduledAt!.toISOString(),
          durationMinutes: values.durationMinutes ?? 60,
          theatreId: values.theatreId!,
          surgeonId: values.surgeonId!,
          admissionId: detail!.Admission?.id ?? null,
          anesthesiaType: values.anesthesiaType ?? null,
          preOpNotes: values.preOpNotes?.trim() || null,
          team: (values.surgeryTeam ?? [])
            .filter((member): member is { userId: string; role: NonNullable<NonNullable<ClinicalFormValues["surgeryTeam"]>[number]["role"]> } =>
              Boolean(member.userId && member.role))
            .map(({ userId, role }) => ({ userId, role })),
        });
        toast.success("Surgery scheduled");
      } else if (action === "updateSurgery") {
        const surgery = detail!.SurgeryCase.find((item) => item.id === values.surgeryId);
        if (!surgery) throw new Error("Select a surgery case.");
        await updateClinicalSurgery(surgery.id, {
          status: values.surgeryStatus!,
          ...(values.scheduledAt ? { scheduledAt: values.scheduledAt.toISOString() } : {}),
          version: surgery.version,
          outcomeNotes: values.outcomeNotes?.trim() || null,
        });
        toast.success("Surgery updated");
      } else if (action === "closeEncounter") {
        await updateClinicalEncounter(detail!.id, {
          status: "closed",
          disposition: values.disposition,
          version: detail!.version,
        });
        toast.success("Encounter closed");
      }
      setAction(null);
      await loadEncounters();
      if (detail) setLoadedDetail(await getClinicalEncounter(detail.id));
    } catch (error) {
      toast.error(errorMessage(error, "Could not complete this clinical action"));
    } finally {
      setSaving(false);
    }
  };

  const startEncounter = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateClinicalEncounter(detail.id, { status: "in_progress", version: detail.version });
      toast.success("Encounter started");
      await reload();
    } catch (error) {
      toast.error(errorMessage(error, "Could not start encounter"));
    } finally {
      setSaving(false);
    }
  };

  const columns: TableProps<ClinicalEncounter>["columns"] = [
    {
      title: "QUEUE",
      dataIndex: "queueNumber",
      width: 90,
      render: (number: number | null) => number ? <Text strong>#{number}</Text> : "—",
    },
    {
      title: "PATIENT",
      key: "patient",
      render: (_, encounter) => (
        <div>
          <Text strong>{encounter.Patient.firstName} {encounter.Patient.lastName}</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{encounter.Patient.mrn}</Text>
        </div>
      ),
    },
    { title: "DEPARTMENT", dataIndex: ["Department", "name"] },
    {
      title: "ARRIVAL",
      dataIndex: "startedAt",
      render: (value: string) => dayjs(value).format("MMM D, h:mm A"),
    },
    {
      title: "TRIAGE",
      dataIndex: "triageLevel",
      render: (value: ClinicalEncounter["triageLevel"]) =>
        value ? <Tag color={triageColor[value]}>{value.toUpperCase()}</Tag> : "—",
    },
    {
      title: "STATUS",
      dataIndex: "status",
      render: (value: ClinicalEncounter["status"]) => <Tag color={statusColor[value]}>{value.replace("_", " ")}</Tag>,
    },
  ];

  const activeBedAssignments = useMemo(
    () => detail?.Admission?.BedAssignment.filter((assignment) => !assignment.releasedAt)
      ?? detail?.BedAssignment.filter((assignment) => !assignment.releasedAt)
      ?? [],
    [detail],
  );

  const renderActionForm = () => {
    switch (action) {
      case "checkin":
        return (
          <>
            <Form.Item name="appointmentId" label="Booked appointment (optional)">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select an appointment or check in a walk-in"
                options={appointments.map((appointment) => ({
                  value: appointment.id,
                  label: `${appointment.Patient.firstName} ${appointment.Patient.lastName} · ${appointment.Department.name} · ${dayjs(appointment.scheduledAt).format("MMM D, h:mm A")}`,
                }))}
              />
            </Form.Item>
            {!selectedAppointmentId && (
              <>
                <Form.Item name="patientId" label="Patient" rules={[{ required: true, message: "Select a patient" }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Choose patient" options={patients.map((patient) => ({
                    value: patient.id,
                    label: `${patient.firstName} ${patient.lastName} · ${patient.mrn}`,
                  }))} />
                </Form.Item>
                <Form.Item name="departmentId" label="Department" rules={[{ required: true, message: "Select a department" }]}>
                  <Select placeholder="Choose department" options={departments.map(({ id, name }) => ({ value: id, label: name }))} />
                </Form.Item>
                <Form.Item name="doctorId" label="Assign doctor (optional)">
                  <Select allowClear placeholder="Assign later if needed" options={doctors.map((doctor) => ({
                    value: doctor.id,
                    label: `${doctor.User.name} · ${doctor.Department.name}`,
                  }))} />
                </Form.Item>
              </>
            )}
            <Form.Item name="source" label="Arrival type" initialValue="walk_in">
              <Select options={[
                { value: "walk_in", label: "Walk-in" },
                { value: "emergency", label: "Emergency" },
                { value: "referral", label: "Referral" },
              ]} />
            </Form.Item>
            <Form.Item name="arrivalMode" label="Arrival mode">
              <Select allowClear options={[
                { value: "walk_in", label: "Walk-in" },
                { value: "ambulance", label: "Ambulance" },
                { value: "referral", label: "Referral" },
              ]} />
            </Form.Item>
            <Form.Item name="triageLevel" label="Triage level">
              <Select allowClear options={[
                { value: "critical", label: "Critical" },
                { value: "urgent", label: "Urgent" },
                { value: "normal", label: "Normal" },
              ]} />
            </Form.Item>
            <Form.Item name="chiefComplaint" label="Chief complaint">
              <Input.TextArea rows={3} maxLength={4000} showCount />
            </Form.Item>
          </>
        );
      case "consultation":
        return (
          <>
            <Form.Item name="kind" label="Consultation type" initialValue="initial">
              <Select options={[
                { value: "initial", label: "Initial consultation" },
                { value: "ward_round", label: "Ward round" },
                { value: "pre_operative", label: "Pre-operative" },
              ]} />
            </Form.Item>
            <Form.Item name="findings" label="Clinical findings"><Input.TextArea rows={3} maxLength={10000} /></Form.Item>
            <Form.Item name="diagnosis" label="Diagnosis"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} maxLength={10000} /></Form.Item>
            <Form.Item name="followUpDate" label="Follow-up date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          </>
        );
      case "prescription":
        return (
          <>
            <Form.Item name="notes" label="Advice"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.List name="prescriptionItems" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Card key={field.key} size="small" title={`Medicine ${field.name + 1}`} extra={
                      fields.length > 1 ? <Button danger type="link" onClick={() => remove(field.name)}>Remove</Button> : null
                    }>
                      <Form.Item {...field} name={[field.name, "medicineId"]} label="Medicine" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" placeholder="Choose medicine" options={medicines.map((medicine) => ({
                          value: medicine.id,
                          label: `${medicine.name}${medicine.strength ? ` · ${medicine.strength}` : ""}`,
                        }))} />
                      </Form.Item>
                      <Space align="start" style={{ width: "100%" }}>
                        <Form.Item {...field} name={[field.name, "dose"]} label="Dose" rules={[{ required: true }]}><Input placeholder="500 mg" /></Form.Item>
                        <Form.Item {...field} name={[field.name, "frequency"]} label="Frequency" rules={[{ required: true }]}><Input placeholder="Twice daily" /></Form.Item>
                        <Form.Item {...field} name={[field.name, "durationDays"]} label="Days"><InputNumber min={1} max={3650} /></Form.Item>
                      </Space>
                      <Form.Item {...field} name={[field.name, "instructions"]} label="Instructions"><Input placeholder="After meals" /></Form.Item>
                    </Card>
                  ))}
                  <Button onClick={() => add({})} block>Add medicine</Button>
                </Space>
              )}
            </Form.List>
          </>
        );
      case "admission":
        return (
          <>
            <Form.Item name="reason" label="Reason for admission" rules={[{ required: true }]}>
              <Input.TextArea rows={3} maxLength={4000} />
            </Form.Item>
            <Form.Item name="admissionDiagnosis" label="Admission diagnosis"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
          </>
        );
      case "assignBed":
        return (
          <Form.Item name="bedId" label="Available bed" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select a free bed" options={availableBeds.map((bed) => ({
              value: bed.id,
              label: `${bed.code} · ${bed.Room?.Ward?.name ?? "Ward"} / ${bed.Room?.name ?? "Room"}`,
            }))} />
          </Form.Item>
        );
      case "transferBed":
        return (
          <>
            <Form.Item label="Current bed"><Input value={activeBedAssignments.map(({ Bed }) => Bed.code).join(", ")} disabled /></Form.Item>
            <Form.Item name="targetBedId" label="Move to" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" placeholder="Select a free bed" options={availableBeds.map((bed) => ({
                value: bed.id,
                label: `${bed.code} · ${bed.Room?.Ward?.name ?? "Ward"} / ${bed.Room?.name ?? "Room"}`,
              }))} />
            </Form.Item>
          </>
        );
      case "releaseBed":
        return (
          <Alert
            type="warning"
            showIcon
            message="Release the current emergency bed?"
            description="This frees the bed but leaves the encounter open. Close the encounter separately when care is complete."
          />
        );
      case "discharge":
        return (
          <>
            <Form.Item name="dischargeType" label="Discharge type" rules={[{ required: true }]}>
              <Select options={[
                { value: "routine", label: "Routine" },
                { value: "against_medical_advice", label: "Against medical advice" },
                { value: "transferred", label: "Transferred" },
                { value: "deceased", label: "Deceased" },
              ]} />
            </Form.Item>
            <Form.Item name="finalDiagnosis" label="Final diagnosis"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="courseInHospital" label="Course in hospital"><Input.TextArea rows={3} maxLength={10000} /></Form.Item>
            <Form.Item name="conditionAtDischarge" label="Condition at discharge"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="proceduresPerformed" label="Procedures performed"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="followUpInstructions" label="Follow-up instructions"><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="followUpDate" label="Follow-up date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          </>
        );
      case "surgery":
        return (
          <>
            <Form.Item name="procedureName" label="Procedure" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
            <Form.Item name="scheduledAt" label="Scheduled time" rules={[{ required: true }]}><DatePicker showTime style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="durationMinutes" label="Duration (minutes)" initialValue={60} rules={[{ required: true }]}>
              <InputNumber min={1} max={1440} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="theatreId" label="Operating theatre" rules={[{ required: true }]}>
              <Select options={theatres.map(({ id, name }) => ({ value: id, label: name }))} />
            </Form.Item>
            <Form.Item name="surgeonId" label="Surgeon" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={doctors.map((doctor) => ({
                value: doctor.id,
                label: `${doctor.User.name} · ${doctor.specialization}`,
              }))} />
            </Form.Item>
            <Form.Item name="anesthesiaType" label="Anesthesia">
              <Select allowClear options={["general", "regional", "local", "sedation"].map((value) => ({ value, label: value }))} />
            </Form.Item>
            <Form.Item name="preOpNotes" label="Pre-operative notes"><Input.TextArea rows={3} maxLength={4000} /></Form.Item>
            <Form.List name="surgeryTeam">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text strong>Additional surgery team</Text>
                  {fields.map((field) => (
                    <Space key={field.key} align="start" style={{ width: "100%" }}>
                      <Form.Item {...field} name={[field.name, "userId"]} label="Team member" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          options={surgeryTeamOptions.map(({ id, name }) => ({ value: id, label: name }))}
                          style={{ minWidth: 200 }}
                        />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "role"]} label="Role" rules={[{ required: true }]}>
                        <Select options={[
                          { value: "assistant_surgeon", label: "Assistant surgeon" },
                          { value: "anesthetist", label: "Anesthetist" },
                          { value: "scrub_nurse", label: "Scrub nurse" },
                          { value: "circulating_nurse", label: "Circulating nurse" },
                        ]} style={{ minWidth: 180 }} />
                      </Form.Item>
                      <Button danger type="link" onClick={() => remove(field.name)}>Remove</Button>
                    </Space>
                  ))}
                  <Button onClick={() => add({})} block>Add team member</Button>
                </Space>
              )}
            </Form.List>
          </>
        );
      case "updateSurgery":
        return (
          <>
            <Form.Item name="surgeryId" label="Surgery case" rules={[{ required: true }]}>
              <Select onChange={() => form.setFieldsValue({ surgeryStatus: undefined, scheduledAt: undefined })} options={detail?.SurgeryCase.map((surgery) => ({
                value: surgery.id,
                label: `${surgery.procedureName} · ${surgery.status} · ${dayjs(surgery.scheduledAt).format("MMM D, h:mm A")}`,
              }))} />
            </Form.Item>
            <Form.Item name="surgeryStatus" label="New status" rules={[{ required: true }]}>
              <Select
                disabled={!selectedSurgery}
                onChange={(status) => {
                  if (status === "scheduled" && selectedSurgery) {
                    form.setFieldsValue({ scheduledAt: dayjs(selectedSurgery.scheduledAt) });
                  } else {
                    form.setFieldsValue({ scheduledAt: undefined });
                  }
                }}
                options={selectedSurgery ? [
                  { value: selectedSurgery.status, label: selectedSurgery.status.replace("_", " ") },
                  ...allowedSurgeryStatuses[selectedSurgery.status].map((status) => ({
                    value: status,
                    label: status === "scheduled" ? "Rescheduled" : status.replace("_", " "),
                  })),
                ].filter((option, index, options) => options.findIndex(({ value }) => value === option.value) === index) : []}
              />
            </Form.Item>
            {selectedSurgeryStatus === "scheduled" && (
              <Form.Item name="scheduledAt" label="Scheduled date and time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            )}
            <Form.Item name="outcomeNotes" label="Outcome notes"><Input.TextArea rows={3} maxLength={10000} /></Form.Item>
          </>
        );
      case "closeEncounter":
        return (
          <Form.Item name="disposition" label="Visit outcome" rules={[{ required: true }]}>
            <Select options={[
              { value: "discharged_home", label: "Discharged home" },
              { value: "admitted", label: "Admitted" },
              { value: "transferred", label: "Transferred" },
              { value: "referred_out", label: "Referred out" },
              { value: "left_without_being_seen", label: "Left without being seen" },
              { value: "deceased", label: "Deceased" },
            ]} />
          </Form.Item>
        );
      default:
        return null;
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      <Space align="center" style={{ width: "100%", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Clinical desk</Title>
          <Text type="secondary">Check in patients, manage the care queue, and document visits.</Text>
        </div>
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={() => void reload()} loading={loading}>Refresh</Button>
          {canWrite && (
            <Button type="primary" icon={<ClipboardPlus size={16} />} onClick={() => void openAction("checkin")}>
              Check in
            </Button>
          )}
        </Space>
      </Space>

      {!canReadQueue && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Your role does not have clinical queue access."
          description="Ask a hospital administrator to grant clinical:encounters:read in Settings → User Roles."
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(360px, 0.9fr)", gap: 16 }}>
        <Card title={<Space><Activity size={18} /> Patient queue</Space>} extra={<Tag>{encounters.filter(({ status }) => status !== "closed").length} open</Tag>}>
          <Table<ClinicalEncounter>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={encounters}
            loading={loading}
            pagination={{
              current: queuePage,
              pageSize: 25,
              total: queueTotal,
              showSizeChanger: false,
              onChange: setQueuePage,
            }}
            rowClassName={(record) => record.id === selectedId ? "ant-table-row-selected" : ""}
            onRow={(record) => ({ onClick: () => setSelectedId(record.id), style: { cursor: "pointer" } })}
            locale={{ emptyText: <Empty description="No encounters yet. Check in a booked appointment or walk-in." /> }}
          />
        </Card>

        <Card
          title={<Space><Stethoscope size={18} /> Encounter details</Space>}
          extra={detail ? <Tag color={statusColor[detail.status]}>{detail.status.replace("_", " ")}</Tag> : null}
          style={{ minHeight: 420 }}
        >
          {detailLoading ? <Spin /> : !detail ? <Empty description="Select a patient from the queue" /> : (
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Patient">
                  {detail.Patient.firstName} {detail.Patient.lastName} · {detail.Patient.mrn}
                </Descriptions.Item>
                <Descriptions.Item label="Department">{detail.Department.name}</Descriptions.Item>
                <Descriptions.Item label="Doctor">{detail.DoctorProfile?.User.name ?? "Unassigned"}</Descriptions.Item>
                <Descriptions.Item label="Queue">
                  {detail.queueNumber ? `#${detail.queueNumber}` : "—"} · {dayjs(detail.startedAt).format("MMM D, h:mm A")}
                </Descriptions.Item>
                <Descriptions.Item label="Visit">
                  {detail.type} · {detail.source}
                  {detail.triageLevel && <> · <Tag color={triageColor[detail.triageLevel]}>{detail.triageLevel}</Tag></>}
                </Descriptions.Item>
                {detail.chiefComplaint && <Descriptions.Item label="Chief complaint">{detail.chiefComplaint}</Descriptions.Item>}
              </Descriptions>

              {!!detail.PatientMedicalData.length && (
                <Card size="small" title="Patient medical history">
                  {detail.PatientMedicalData.map((record) => (
                    <div key={record.id} style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ display: "block" }}>
                        Recorded {dayjs(record.recordedAt).format("MMM D, YYYY")}
                      </Text>
                      <Descriptions size="small" column={2}>
                        <Descriptions.Item label="Allergies">{record.allergies || "None recorded"}</Descriptions.Item>
                        <Descriptions.Item label="Chronic conditions">{record.chronicConditions || "None recorded"}</Descriptions.Item>
                        <Descriptions.Item label="Past surgeries">{record.pastSurgeries || "None recorded"}</Descriptions.Item>
                        <Descriptions.Item label="Blood pressure">
                          {record.systolicBloodPressure != null && record.diastolicBloodPressure != null
                            ? `${record.systolicBloodPressure}/${record.diastolicBloodPressure}`
                            : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Heart rate">{record.heartRate ?? "—"}</Descriptions.Item>
                        <Descriptions.Item label="Blood glucose">{record.bloodGlucose ?? "—"}</Descriptions.Item>
                        {record.note && <Descriptions.Item label="Notes" span={2}>{record.note}</Descriptions.Item>}
                      </Descriptions>
                    </div>
                  ))}
                </Card>
              )}

              {detail.status !== "closed" && (
                <Space wrap>
                  {detail.status === "waiting" && canWrite && <Button type="primary" onClick={() => void startEncounter()} loading={saving}>Start visit</Button>}
                  {hasPermission("clinical:consultations:write") && <Button onClick={() => void openAction("consultation")}>Consultation</Button>}
                  {hasPermission("clinical:prescriptions:write") && hasPermission("clinical:medicines:read") && <Button onClick={() => void openAction("prescription")}>Prescription</Button>}
                  {!detail.Admission && hasPermission("clinical:admissions:write") && <Button onClick={() => void openAction("admission")}>Admit</Button>}
                  {detail.Admission?.status === "admitted" && (
                    <>
                      {!activeBedAssignments.length && hasPermission("clinical:beds:write") && <Button icon={<BedDouble size={15} />} onClick={() => void openAction("assignBed")}>Assign bed</Button>}
                      {!!activeBedAssignments.length && hasPermission("clinical:beds:write") && <Button onClick={() => void openAction("transferBed")}>Transfer bed</Button>}
                      {hasPermission("clinical:admissions:discharge") && <Button danger onClick={() => void openAction("discharge")}>Discharge</Button>}
                    </>
                  )}
                  {detail.type === "emergency" && !detail.Admission && (
                    hasPermission("clinical:beds:write") && (activeBedAssignments.length
                      ? <>
                          <Button onClick={() => void openAction("transferBed")}>Transfer ER bed</Button>
                          <Button danger onClick={() => void openAction("releaseBed")}>Release ER bed</Button>
                        </>
                      : <Button onClick={() => void openAction("assignBed")}>Assign ER bed</Button>)
                  )}
                  {hasPermission("clinical:surgeries:write") && hasPermission("clinical:surgeries:read") && <Button onClick={() => void openAction("surgery")}>Schedule surgery</Button>}
                  {detail.SurgeryCase.length > 0 && hasPermission("clinical:surgeries:write") && <Button onClick={() => void openAction("updateSurgery")}>Update surgery</Button>}
                  {canWrite && !detail.Admission && !activeBedAssignments.length &&
                    !detail.SurgeryCase.some((surgery) => ["scheduled", "in_progress"].includes(surgery.status)) &&
                    <Button danger type="text" onClick={() => void openAction("closeEncounter")}>Close encounter</Button>}
                  {canWrite && (detail.Admission?.status === "admitted" || activeBedAssignments.length > 0 ||
                    detail.SurgeryCase.some((surgery) => ["scheduled", "in_progress"].includes(surgery.status))) &&
                    <Text type="secondary">Resolve active admissions, bed assignments, and surgeries before closing.</Text>}
                </Space>
              )}

              {!!detail.Consultation.length && (
                <>
                  <Divider>Consultations</Divider>
                  {detail.Consultation.map((consultation) => (
                    <Card key={consultation.id} size="small" title={`${consultation.kind.replace("_", " ")} · ${dayjs(consultation.createdAt).format("MMM D, h:mm A")}`}>
                      {consultation.diagnosis && <Text strong>Diagnosis: {consultation.diagnosis}<br /></Text>}
                      {consultation.findings && <Text>{consultation.findings}<br /></Text>}
                      {consultation.notes && <Text type="secondary">{consultation.notes}</Text>}
                    </Card>
                  ))}
                </>
              )}

              {!!detail.Prescription.length && (
                <>
                  <Divider>Prescriptions</Divider>
                  {detail.Prescription.map((prescription) => (
                    <Card
                      key={prescription.id}
                      size="small"
                      title={<Space>{dayjs(prescription.createdAt).format("MMM D, h:mm A")}<Tag color={prescription.status === "active" ? "green" : "default"}>{prescription.status}</Tag></Space>}
                      extra={prescription.status === "active" && hasPermission("clinical:prescriptions:write") ? (
                        <Button
                          danger
                          size="small"
                          onClick={() => Modal.confirm({
                            title: "Cancel this prescription?",
                            content: "This will mark the prescription as cancelled in the clinical record.",
                            okText: "Cancel prescription",
                            okButtonProps: { danger: true },
                            onOk: async () => {
                              try {
                                await cancelClinicalPrescription(prescription.id);
                                toast.success("Prescription cancelled");
                                setLoadedDetail(await getClinicalEncounter(detail.id));
                              } catch (error) {
                                toast.error(errorMessage(error, "Could not cancel prescription"));
                                throw error;
                              }
                            },
                          })}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    >
                      {prescription.PrescriptionItem.map((item) => (
                        <Text key={item.id} style={{ display: "block" }}>
                          {item.Medicine.name} {item.Medicine.strength ?? ""} — {item.dose}, {item.frequency}
                          {item.durationDays ? ` for ${item.durationDays} days` : ""}
                        </Text>
                      ))}
                    </Card>
                  ))}
                </>
              )}

              {!!activeBedAssignments.length && (
                <>
                  <Divider>Current bed</Divider>
                  {activeBedAssignments.map(({ id, Bed }) => (
                    <Text key={id}>{Bed.code} · {Bed.Room?.Ward?.name ?? "Ward"} / {Bed.Room?.name ?? "Room"}</Text>
                  ))}
                </>
              )}

              {!!detail.SurgeryCase.length && (
                <>
                  <Divider>Surgery cases</Divider>
                  {detail.SurgeryCase.map((surgery) => (
                    <Text key={surgery.id} style={{ display: "block" }}>
                      {surgery.procedureName} · {surgery.status} · {surgery.OperatingTheatre.name} · {dayjs(surgery.scheduledAt).format("MMM D, h:mm A")}
                    </Text>
                  ))}
                </>
              )}
            </Space>
          )}
        </Card>
      </div>

      <Modal
        title={action ? actionTitles[action] : ""}
        open={Boolean(action)}
        onCancel={() => setAction(null)}
        onOk={() => void form.submit()}
        confirmLoading={saving}
        okText={action === "closeEncounter" || action === "discharge" ? "Confirm" : "Save"}
        width={action === "prescription" || action === "discharge" ? 720 : 560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void finishAction(values)} preserve={false}>
          {renderActionForm()}
        </Form>
      </Modal>
    </div>
    </ConfigProvider>
  );
}
