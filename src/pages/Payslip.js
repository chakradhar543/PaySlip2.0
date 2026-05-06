import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import logo from "../assets/company-logo.png";

const COMPANY_GST = "36AAIFU2638L1ZQ";

export default function PayslipCTC() {
  const pdfRef = useRef();

  const [data, setData] = useState({
    name: "",
    payslipFor: "",
    designation: "",
    ctc: "",
    associateId: "",
    joinDate: "",
    location: "",
    department: "",
    daysPayable: 30,
    daysWorked: 30,
    lopDays: 0,
    address: "",
    uan: "",
    pan: "",
  });

  const [variablePayEnabled, setVariablePayEnabled] = useState(false);
  const [variablePayAmount, setVariablePayAmount] = useState(0);

  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);

  const [pfEnabled, setPfEnabled] = useState(false);
  const [employeeShareAmount, setEmployeeShareAmount] = useState(0);
  const [employerShareAmount, setEmployerShareAmount] = useState(0);
  const [uanEnabled, setUanEnabled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [addressEnabled, setAddressEnabled] = useState(false);

  const [TdsEnabled, setTdsEnabled] = useState(false);
  const [TdsAmountInput, setTdsAmount] = useState(0);

  const [excelRows, setExcelRows] = useState([]);
  const [uploadedPayslips, setUploadedPayslips] = useState([]);
  const [currentPayslipIndex, setCurrentPayslipIndex] = useState(0);

  const defaultData = {
    name: "",
    payslipFor: "",
    designation: "",
    ctc: "",
    associateId: "",
    joinDate: "",
    location: "",
    department: "",
    daysPayable: 30,
    daysWorked: 30,
    lopDays: 0,
    address: "",
    uan: "",
    pan: "",
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => {
      const next = { ...prev, [name]: value };
      const worked = Number(next.daysWorked || 0);
      const lop = Number(next.lopDays || 0);
      next.daysPayable = lop > 0 ? Math.max(worked - lop, 0) : worked;
      return next;
    });
  };

  /* ===== HELPERS ===== */
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const formatINR = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const withPdfBorders = () => {
    const node = pdfRef.current;
    if (!node) return () => {};
    node.classList.add("pdf-borders");
    return () => node.classList.remove("pdf-borders");
  };

  /* ===== SALARY ===== */
  const fixedAnnualCTC = Number(data.ctc || 0);
  const variablePay = variablePayEnabled ? Number(variablePayAmount || 0) : 0;
  const annualCTC = fixedAnnualCTC + variablePay;
  const monthlyCTC = annualCTC / 12;
  const monthlyFixedCTC = fixedAnnualCTC / 12;
  const monthlyVariablePay = variablePay / 12;
  const basic = monthlyFixedCTC * 0.5;
  const hra = basic * 0.4;
  const special = monthlyFixedCTC - (basic + hra);

  const bonus = bonusEnabled ? Number(bonusAmount) : 0;

  const lopDeduction = (monthlyFixedCTC / 30) * Number(data.lopDays || 0);
  const workedDays = Number(data.daysWorked || 0);
  const lopDays = Number(data.lopDays || 0);
  const payableDays = lopDays > 0 ? Math.max(workedDays - lopDays, 0) : workedDays;

  const pfEmployee = pfEnabled ? Number(employeeShareAmount || 0) : 0;
  const pfEmployer = pfEnabled ? Number(employerShareAmount || 0) : 0;
  const pf = pfEmployee + pfEmployer;
  const profTax = 200;
  const TdsAmount = TdsEnabled ? Number(TdsAmountInput || 0) : 0;
  const grossEarnings = basic + hra + special + monthlyVariablePay + bonus;
  const grossDeductions = pf + profTax + lopDeduction + TdsAmount ;

  const netSalary = grossEarnings - grossDeductions;
  const showEmployeePF = pfEnabled;
  const showEmployerPF = pfEnabled;
  const showLopDays = Number(data.lopDays || 0) > 0;
  const showLopDeduction = Number(data.lopDays || 0) > 0;

  const earningsRows = [
    { label: "Basic", amount: basic },
    { label: "HRA", amount: hra },
    { label: "Special Allowance", amount: special },
    ...(variablePayEnabled ? [{ label: "Variable Pay", amount: monthlyVariablePay }] : []),
    ...(bonusEnabled ? [{ label: "Bonus", amount: bonus }] : []),
  ];

  const deductionRows = [
    ...(showEmployeePF ? [{ label: "Employee PF", amount: pfEmployee }] : []),
    ...(showEmployerPF ? [{ label: "Employer PF", amount: pfEmployer }] : []),
    { label: "Professional Tax", amount: profTax },
    ...(showLopDeduction ? [{ label: "LOP Deduction", amount: lopDeduction }] : []),
    ...(TdsEnabled ? [{ label: "TDS", amount: TdsAmount }] : []),
  ];

  const salaryRowCount = Math.max(earningsRows.length, deductionRows.length);

  /* ===== PDF ===== */
  const downloadPDF = async () => {
    const cleanup = withPdfBorders();
    try {
      const scale = Math.max(2, window.devicePixelRatio || 2);
      const canvas = await html2canvas(pdfRef.current, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const renderHeight = Math.min(imgHeight, pdfHeight);
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        renderHeight,
        undefined,
        "SLOW"
      );
      const safe = (value) =>
        String(value || "")
          .trim()
          .replace(/[\\/:*?"<>|]+/g, "-");
      const namePart = safe(data.name) || "Payslip";
      const payslipForPart = safe(data.payslipFor) || "Period";
      const filename = `${namePart}-${payslipForPart}.pdf`;
      pdf.save(filename);
    } finally {
      cleanup();
    }
  };

  /* ===== EXCEL ===== */
  const excelBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  const applyExcelBorders = (worksheet) => {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border: excelBorder };
      }
    }
  };

  const buildExcelRow = () => ({
      Name: data.name,
      "Payslip For": data.payslipFor,
      Designation: data.designation,
      "Annual CTC": annualCTC,
      "Fixed Annual CTC": fixedAnnualCTC,
      "Variable Annual CTC": variablePay,
      "Monthly CTC": monthlyCTC,
      "Monthly Fixed CTC": monthlyFixedCTC,
      "Associate ID": data.associateId,
      "Join Date": formatDate(data.joinDate),
      Location: data.location,
      Department: data.department,
      "Days Payable": payableDays,
      "Days Worked": workedDays,
      "LOP Days": lopDays,
      PAN: data.pan,
      GST: COMPANY_GST,
      UAN: uanEnabled ? data.uan : "",
      Address: addressEnabled ? data.address : "",
      Basic: basic,
      HRA: hra,
      "Special Allowance": special,
      Bonus: bonus,
      "Variable Pay": monthlyVariablePay,
      "PF Employee": pfEmployee,
      "PF Employer": pfEmployer,
      "PF Total": pf,
      "Tds": TdsAmount,
      "Professional Tax": profTax,
      "LOP Deduction": lopDeduction,
      "Gross Earnings": grossEarnings,
      "Gross Deductions": grossDeductions,
      "Net Salary": netSalary,
    });

  const normalizeHeader = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const getCell = (row, labels) => {
    const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
      acc[normalizeHeader(key)] = value;
      return acc;
    }, {});

    for (const label of labels) {
      const value = normalizedRow[normalizeHeader(label)];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  };

  const toNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") return fallback;
    const number = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(number) ? number : fallback;
  };

  const toExcelDateInput = (value) => {
    if (!value) return "";
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d
      ).padStart(2, "0")}`;
    }

    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) return String(value);
    return asDate.toISOString().slice(0, 10);
  };

  const normalizePayslipRow = (row) => {
    const fixedCTC = toNumber(
      getCell(row, ["Fixed Annual CTC", "Annual CTC", "CTC"])
    );
    const variableAnnual = toNumber(
      getCell(row, ["Variable Annual CTC", "Variable Annual Pay"]),
      toNumber(getCell(row, ["Variable Pay"])) * 12
    );
    const bonusValue = toNumber(getCell(row, ["Bonus", "Bonus Amount"]));
    const employeePF = toNumber(getCell(row, ["PF Employee", "Employee PF"]));
    const employerPF = toNumber(getCell(row, ["PF Employer", "Employer PF"]));
    const tdsValue = toNumber(getCell(row, ["Tds", "TDS", "TDS Amount"]));
    const uanValue = getCell(row, ["UAN", "UAN Number"]);
    const addressValue = getCell(row, ["Address"]);
    const daysWorkedValue = toNumber(getCell(row, ["Days Worked"]), 30);
    const lopDaysValue = toNumber(getCell(row, ["LOP Days"]), 0);
    const daysPayableValue = getCell(row, ["Days Payable"]);

    return {
      data: {
        ...defaultData,
        name: getCell(row, ["Name", "Employee Name"]),
        payslipFor: getCell(row, ["Payslip For", "Month", "Pay Period"]),
        designation: getCell(row, ["Designation"]),
        ctc: fixedCTC,
        associateId: getCell(row, ["Associate ID", "Employee ID", "AssociateId"]),
        joinDate: toExcelDateInput(getCell(row, ["Join Date", "Date of Joining"])),
        location: getCell(row, ["Location"]),
        department: getCell(row, ["Department"]),
        daysWorked: daysWorkedValue,
        lopDays: lopDaysValue,
        daysPayable:
          daysPayableValue === ""
            ? Math.max(daysWorkedValue - lopDaysValue, 0)
            : toNumber(daysPayableValue, 30),
        address: addressValue,
        uan: uanValue,
        pan: getCell(row, ["PAN", "Pan"]),
      },
      variablePayEnabled: variableAnnual > 0,
      variablePayAmount: variableAnnual,
      bonusEnabled: bonusValue > 0,
      bonusAmount: bonusValue,
      pfEnabled: employeePF > 0 || employerPF > 0,
      employeeShareAmount: employeePF,
      employerShareAmount: employerPF,
      uanEnabled: Boolean(uanValue),
      addressEnabled: Boolean(addressValue),
      TdsEnabled: tdsValue > 0,
      TdsAmountInput: tdsValue,
    };
  };

  const applyPayslip = (payslip, index) => {
    setData(payslip.data);
    setVariablePayEnabled(payslip.variablePayEnabled);
    setVariablePayAmount(payslip.variablePayAmount);
    setBonusEnabled(payslip.bonusEnabled);
    setBonusAmount(payslip.bonusAmount);
    setPfEnabled(payslip.pfEnabled);
    setEmployeeShareAmount(payslip.employeeShareAmount);
    setEmployerShareAmount(payslip.employerShareAmount);
    setUanEnabled(payslip.uanEnabled);
    setAddressEnabled(payslip.addressEnabled);
    setTdsEnabled(payslip.TdsEnabled);
    setTdsAmount(payslip.TdsAmountInput);
    setCurrentPayslipIndex(index);
    setConfirmed(true);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, {
        type: "array",
        cellDates: true,
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const payslips = rows
        .map(normalizePayslipRow)
        .filter((row) => row.data.name || row.data.associateId);

      if (payslips.length === 0) {
        window.alert("No payslip rows found in the uploaded Excel file.");
        return;
      }

      setUploadedPayslips(payslips);
      applyPayslip(payslips[0], 0);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const showUploadedPayslip = (nextIndex) => {
    const safeIndex = Math.min(
      Math.max(nextIndex, 0),
      uploadedPayslips.length - 1
    );
    applyPayslip(uploadedPayslips[safeIndex], safeIndex);
  };

  const downloadExcel = () => {
    if (excelRows.length === 0) {
      window.alert("Please generate at least 1 payslip before downloading Excel.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    applyExcelBorders(worksheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payslip");
    XLSX.writeFile(workbook, "Payslip.xlsx", { cellStyles: true });
    setExcelRows([]);
  };

  const formFields = [
    ["name", "Name"],
    ["payslipFor", "Payslip For"],
    ["designation", "Designation"],
    ["ctc", "Annual CTC"],
    ["associateId", "Associate ID"],
    ["joinDate", "Join Date"],
    ["location", "Location"],
    ["department", "Department"],
    ["daysPayable", "Days Payable"],
    ["daysWorked", "Days Worked"],
    ["lopDays", "LOP Days"],
    ["pan", "PAN"],
  ];

  return (
    <div className="container my-4">
      <h4>CTC Payslip Generator</h4>

      {/* ===== FORM ===== */}
      <div className="row g-3 mb-3">
        {formFields.map(([key, label]) => (
          <div className="col-md-3" key={key}>
            <label>{label}</label>
            <input
              type={key === "joinDate" ? "date" : "text"}
              name={key}
              className="form-control"
              value={data[key] || ""}
              onChange={handleChange}
            />
          </div>
        ))}
        {/*========= Variable pay===== */}
        {/* Variable Pay */} 
        <div className="col-md-3"> 
          <label>Variable Pay</label> 
          <select className="form-control" 
          value={variablePayEnabled ? "yes" : "no"}
          onChange={(e) => setVariablePayEnabled(e.target.value === "yes")} 
          > 
            <option value="no">No</option> 
            <option value="yes">Yes</option> 
            </select> </div> 
            {variablePayEnabled && ( 
              <div className="col-md-3"> 
              <label>Variable Pay Amount (Annual)</label> 
              <input type="number" className="form-control" 
              value={variablePayAmount}
              onChange={(e) => setVariablePayAmount(e.target.value)} /> 
              </div> )} 
              {/* Bonus */} 
              <div className="col-md-3"> 
                <label>Bonus</label> 
                <select className="form-control" 
                value={bonusEnabled ? "yes" : "no"}
                onChange={(e) => setBonusEnabled(e.target.value === "yes")} > 
                <option value="no">No</option> 
                <option value="yes">Yes</option> 
                </select> 
                </div> 
                {bonusEnabled && ( 
                  <div className="col-md-3"> 
                  <label>Bonus Amount</label> 
                  <input type="number" className="form-control" 
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)} /> 
                  </div> )}
                    <div className="col-md-3">
                      <label>PF</label>
                      <select
                        className="form-control"
                        value={pfEnabled ? "yes" : "no"}
                        onChange={(e) => {
                          const enabled = e.target.value === "yes";
                          setPfEnabled(enabled);
                          if (!enabled) {
                            setEmployeeShareAmount(0);
                            setEmployerShareAmount(0);
                          }
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {pfEnabled && (
                      <div className="col-md-3">
                        <label>Employee PF Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          value={employeeShareAmount}
                          onChange={(e) => setEmployeeShareAmount(e.target.value)}
                        />
                      </div>
                    )}
                    {pfEnabled && (
                      <div className="col-md-3">
                        <label>Employer PF Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          value={employerShareAmount}
                          onChange={(e) => setEmployerShareAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                      <label>UAN</label>
                      <select
                        className="form-control"
                        value={uanEnabled ? "yes" : "no"}
                        onChange={(e) => setUanEnabled(e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label>GST</label>
                      <input
                        type="text"
                        name="gst"
                        className="form-control"
                        value={COMPANY_GST}
                        onChange={handleChange}
                      />
                    </div>
                    {uanEnabled && (
                      <div className="col-md-3">
                        <label>UAN Number</label>
                        <input
                          type="text"
                          name="uan"
                          className="form-control"
                          value={data.uan}
                          onChange={handleChange}
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                        <label>Address</label>
                        <select
                          className="form-control"
                          value={addressEnabled ? "yes" : "no"}
                          onChange={(e) => setAddressEnabled(e.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      {addressEnabled && (
                        <div className="col-md-6">
                          <label>Address</label>
                          <input
                            type="text"
                            name="address"
                            className="form-control"
                            value={data.address}
                            onChange={handleChange}
                          />
                        </div>
                      )}
                      <div className="col-md-3">
                        <label>TDS</label>
                        <select
                          className="form-control"
                          value={TdsEnabled ? "yes" : "no"}
                          onChange={(e) => setTdsEnabled(e.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      {TdsEnabled && (
                        <div className="col-md-3">
                          <label>TDS Amount</label>
                          <input
                            type="number"
                            className="form-control"
                            value={TdsAmountInput}
                            onChange={(e) => setTdsAmount(e.target.value)}
                          />
                        </div>
                      )}
                      <button
                className="btn btn-success mb-1"
                onClick={() => {
                  setConfirmed(true);
                }}
              >
                Generate Payslip
              </button>
              <button
                className="btn btn-outline-success mb-1 ms-2"
                onClick={() => {
                  setExcelRows((prev) => [...prev, buildExcelRow()]);
                }}
              >
                Add Current Row
              </button>
              <div className="col-md-4">
                <label>Upload Excel</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="form-control"
                  onChange={handleExcelUpload}
                />
              </div>
              <div className="text-muted mt-2">
              Excel entries: {excelRows.length}
              </div>
              {uploadedPayslips.length > 0 && (
                <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPayslipIndex === 0}
                    onClick={() => showUploadedPayslip(currentPayslipIndex - 1)}
                  >
                    Previous
                  </button>
                  <span className="text-muted">
                    Payslip {currentPayslipIndex + 1} of {uploadedPayslips.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPayslipIndex === uploadedPayslips.length - 1}
                    onClick={() => showUploadedPayslip(currentPayslipIndex + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
          {/* ===== PAYSLIP ===== */}
          {confirmed && (
            <>
              <div ref={pdfRef} className="a4-page">
                {/* HEADER */}
                <div className="payslip-header">
                  <div className="header-left">
                    <div className="confidential-text">
                      PRIVATE & CONFIDENTIAL
                    </div>
                    <div className="logo-row">
                      <img src={logo} alt="logo" className="company-logo" />
                    </div>
                    <div className="header-employee-info">
                      <div className="info-row">
                        <span className="label">Name</span>
                        <span className="colon">:</span>
                        <span className="value">{data.name}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Designation</span>
                        <span className="colon">:</span>
                        <span className="value">{data.designation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="header-right">
                    <div className="info-row">
                      <span className="label">Payslip For</span>
                      <span className="colon">:</span>
                      <span className="value">{data.payslipFor}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">CTC</span>
                      <span className="colon">:</span>
                      <span className="value">{formatINR(annualCTC)}</span>
                    </div>
                  </div>
                </div>
                {/* DETAILS */}
                <table className="master-table">
                  <tbody>
                    {/* ================= DETAILS SECTION ================= */}
                    <tr>
                    <td colSpan="5" className="no-padding">
                    <table className="details-inner">
                      <tbody>
                        <tr>
                          <td className="label">Associate ID</td>
                          <td>{data.associateId}</td>
                          <td className="label">Location</td>
                          <td>{data.location}</td>
                        </tr>

                        <tr>
                          <td className="label">Join Date</td>
                          <td>{formatDate(data.joinDate)}</td>
                          <td className="label">Department</td>
                          <td>{data.department}</td>
                        </tr>

                        <tr>
                          <td className="label">Days Worked</td>
                          <td>{data.daysWorked}</td>
                          <td className="label">Days Payable</td>
                          <td>{payableDays}</td>
                        </tr>


                      {uanEnabled ? (
                        <>
                          <tr>
                            <td className="label">UAN</td>
                            <td>{data.uan}</td>

                            <td className="label">PAN</td>
                            <td>{data.pan}</td>
                          </tr>
                          {showLopDays && (
                            <tr>
                              <td className="label">LOP Days</td>
                              <td>{lopDays}</td>
                              <td></td>
                              <td></td>
                            </tr>
                          )}
                        </>
                      ) : (
                        <tr>
                          <td className="label">PAN</td>
                          <td>{data.pan}</td>
                          {showLopDays ? (
                            <>
                              <td className="label">LOP Days</td>
                              <td>{lopDays}</td>
                            </>
                          ) : (
                            <>
                              <td></td>
                              <td></td>
                            </>
                          )}
                        </tr>
                      )}
                    </tbody>
                    </table>
                  </td>
                </tr>

                {/* ================= SALARY SECTION ================= */}
                <tr>
                  <td colSpan="5" className="no-padding">
                    <table className="salary-inner">
                      <thead>
                        <tr>
                          <th>EARNINGS</th>
                          <th>AMOUNT</th>
                          <th className="center-divider"></th>
                          <th>DEDUCTIONS</th>
                          <th>AMOUNT</th>
                        </tr>
                      </thead>

                      <tbody>
                        {Array.from({ length: salaryRowCount }).map((_, index) => {
                          const earning = earningsRows[index];
                          const deduction = deductionRows[index];
                          return (
                            <tr key={index}>
                              <td>{earning ? earning.label : ""}</td>
                              <td className="amount">
                                {earning ? formatINR(earning.amount) : ""}
                              </td>
                              <td className="center-divider"></td>
                              <td>{deduction ? deduction.label : ""}</td>
                              <td className="amount">
                                {deduction ? formatINR(deduction.amount) : ""}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="total-row">
                          <td>Total</td>
                          <td className="amount">{formatINR(grossEarnings)}</td>
                          <td className="center-divider"></td>
                          <td>Total</td>
                          <td className="amount">{formatINR(grossDeductions)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="net-salary">
              Net Salary / Month : ₹{formatINR(netSalary)}
            </div>
            {/* ===== FOOTER ===== */}
          <div className="payslip-footer">
            <div className="company-footer-name">
              UXINTERFACELY IT SOLUTIONS
            </div>

            {addressEnabled && data.address && (
              <div className="company-footer-address">
                {data.address}
              </div>
            )}
            <div className="company-footer-gst">
              GST:{COMPANY_GST}
            </div>

            <div className="company-footer-note">
              This is a computer-generated payslip.
            </div>
          </div>
          </div>
          <button className="btn btn-primary mt-3" onClick={downloadPDF}>
            Download PDF
          </button>
          <button className="btn btn-outline-primary mt-3 ms-2" onClick={downloadExcel}>
            Download Excel
          </button>
        </>
      )}
      </div>
    </div>
  );
}
