import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import logo from "../assets/company-logo.jpeg";

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
    gst: "",
    uan: "",
    pan: "",
  });

  const [variablePayEnabled, setVariablePayEnabled] = useState(false);
  const [variablePayAmount, setVariablePayAmount] = useState(0);

  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);

  const [employeeShareEnabled, setEmployeeShareEnabled] = useState(false);
  const [employeeShareAmount, setEmployeeShareAmount] = useState(0);
  const [employerShareEnabled, setEmployerShareEnabled] = useState(false);
  const [employerShareAmount, setEmployerShareAmount] = useState(0);
  const [uanEnabled, setUanEnabled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [addressEnabled, setAddressEnabled] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const handleChange = (e) =>
    setData({ ...data, [e.target.name]: e.target.value });

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
  const monthlyCTC = Number(data.ctc || 0) / 12;
  const basic = monthlyCTC * 0.5;
  const hra = basic * 0.4;
  const special = monthlyCTC - (basic + hra);

  const variablePay = variablePayEnabled ? Number(variablePayAmount) : 0;
  const bonus = bonusEnabled ? Number(bonusAmount) : 0;

  const lopDeduction = (monthlyCTC / 30) * Number(data.lopDays || 0);

  const pfEmployee = employeeShareEnabled ? Number(employeeShareAmount || 0) : 0;
  const pfEmployer = employerShareEnabled ? Number(employerShareAmount || 0) : 0;
  const pf = pfEmployee + pfEmployer;
  const profTax = 200;

  const grossEarnings = basic + hra + special + bonus;
  const grossDeductions = pf + profTax + lopDeduction + variablePay;

  const netSalary = grossEarnings - grossDeductions;

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
      "Annual CTC": Number(data.ctc || 0),
      "Monthly CTC": monthlyCTC,
      "Associate ID": data.associateId,
      "Join Date": formatDate(data.joinDate),
      Location: data.location,
      Department: data.department,
      "Days Payable": Number(data.daysPayable || 0),
      "Days Worked": Number(data.daysWorked || 0),
      "LOP Days": Number(data.lopDays || 0),
      PAN: data.pan,
      GST: data.gst,
      UAN: uanEnabled ? data.uan : "",
      Address: addressEnabled ? data.address : "",
      Basic: basic,
      HRA: hra,
      "Special Allowance": special,
      Bonus: bonus,
      "Variable Pay": variablePay,
      "PF Employee": pfEmployee,
      "PF Employer": pfEmployer,
      "PF Total": pf,
      "Professional Tax": profTax,
      "LOP Deduction": lopDeduction,
      "Gross Earnings": grossEarnings,
      "Gross Deductions": grossDeductions,
      "Net Salary": netSalary,
    });

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
    ["gst", "GST"],
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
          onChange={(e) => setVariablePayEnabled(e.target.value === "yes")} 
          > 
            <option value="no">No</option> 
            <option value="yes">Yes</option> 
            </select> </div> 
            {variablePayEnabled && ( 
              <div className="col-md-3"> 
              <label>Variable Pay Amount</label> 
              <input type="number" className="form-control" 
              onChange={(e) => setVariablePayAmount(e.target.value)} /> 
              </div> )} 
              {/* Bonus */} 
              <div className="col-md-3"> 
                <label>Bonus</label> 
                <select className="form-control" 
                onChange={(e) => setBonusEnabled(e.target.value === "yes")} > 
                <option value="no">No</option> 
                <option value="yes">Yes</option> 
                </select> 
                </div> 
                {bonusEnabled && ( 
                  <div className="col-md-3"> 
                  <label>Bonus Amount</label> 
                  <input type="number" className="form-control" 
                  onChange={(e) => setBonusAmount(e.target.value)} /> 
                  </div> )}
                    <div className="col-md-3">
                      <label>Employee PF</label>
                      <select
                        className="form-control"
                        onChange={(e) => {
                          const enabled = e.target.value === "yes";
                          setEmployeeShareEnabled(enabled);
                          if (!enabled) {
                            setEmployeeShareAmount(0);
                          }
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {employeeShareEnabled && (
                      <div className="col-md-3">
                        <label>Employee PF Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          onChange={(e) => setEmployeeShareAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                      <label>Employer PF</label>
                      <select
                        className="form-control"
                        onChange={(e) => {
                          const enabled = e.target.value === "yes";
                          setEmployerShareEnabled(enabled);
                          if (!enabled) {
                            setEmployerShareAmount(0);
                          }
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    {employerShareEnabled && (
                      <div className="col-md-3">
                        <label>Employer PF Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          onChange={(e) => setEmployerShareAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                      <label>UAN</label>
                      <select
                        className="form-control"
                        onChange={(e) => setUanEnabled(e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
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
                </div>
              <button
                className="btn btn-success mb-3"
                onClick={() => {
                  setConfirmed(true);
                }}
              >
                Generate Payslip
              </button>
              <button
                className="btn btn-outline-success mb-3 ms-2"
                onClick={() => {
                  setExcelRows((prev) => [...prev, buildExcelRow()]);
                }}
              >
                Upload Excel
              </button>
              <div className="text-muted mt-2">
              Excel entries: {excelRows.length}
              </div>
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
                  </div>
                  <div className="header-right">
                    <div className="info-row">
                      <span className="label">Payslip For</span>
                      <span className="colon">:</span>
                      <span className="value">{data.payslipFor}</span>
                    </div>
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
                    <div className="info-row">
                      <span className="label">CTC</span>
                      <span className="colon">:</span>
                      <span className="value">{formatINR(data.ctc)}</span>
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
                          <td>{data.daysPayable}</td>
                        </tr>

                      {uanEnabled ? (
                        <>
                          <tr>
                            <td className="label">UAN</td>
                            <td>{data.uan}</td>

                            <td className="label">PAN</td>
                            <td>{data.pan}</td>
                          </tr>
                          <tr>
                           <td className="label">LOP Days</td>
                            <td>{data.lopDays ? data.lopDays : 0}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="label">PAN</td>
                          <td>{data.pan}</td>
                          <td className="label">LOP Days</td>
                          <td>{data.lopDays ? data.lopDays : 0}</td>
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
                        <tr>
                          <td>Basic</td>
                          <td className="amount">{formatINR(basic)}</td>
                          <td className="center-divider"></td>
                          <td>Employee PF</td>
                          <td className="amount">{formatINR(pfEmployee)}</td>
                        </tr>

                        <tr>
                          <td>HRA</td>
                          <td className="amount">{formatINR(hra)}</td>
                          <td className="center-divider"></td>
                          <td>Employer PF</td>
                          <td className="amount">{formatINR(pfEmployer)}</td>
                        </tr>

                        <tr>
                          <td>Special Allowance</td>
                          <td className="amount">{formatINR(special)}</td>
                          <td className="center-divider"></td>
                          <td>Professional Tax</td>
                          <td className="amount">{formatINR(profTax)}</td>
                        </tr>

                        <tr>
                          <td>{bonusEnabled ? "Bonus" : ""}</td>
                          <td className="amount">
                            {bonusEnabled ? formatINR(bonus) : ""}
                          </td>
                          <td className="center-divider"></td>
                          <td>LOP Deduction</td>
                          <td className="amount">{formatINR(lopDeduction)}</td>
                        </tr>

                        {variablePayEnabled && (
                          <tr>
                            <td></td>
                            <td className="amount"></td>
                            <td className="center-divider"></td>
                            <td>Variable Pay</td>
                            <td className="amount">
                              {formatINR(variablePay)}
                            </td>
                          </tr>
                        )}
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
              GSTIN: {data.gst}
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
  );
}
