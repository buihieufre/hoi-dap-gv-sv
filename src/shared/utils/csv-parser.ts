import Papa from "papaparse";

export interface CSVUserRow {
  fullName: string;
  email: string;
  studentId: string;
  role: string;
}

export interface ParsedCSVUser {
  fullName: string;
  email: string;
  studentId?: string;
  role: "STUDENT" | "ADVISOR" | "ADMIN";
}

/**
 * Parse CSV string/buffer and extract user data
 * Expected columns: Họ và tên đầy đủ, email, mã sinh viên, role
 * This function works in both browser and server environments
 */
export function parseCSVContent(csvContent: string | Buffer): ParsedCSVUser[] {
  const csvString =
    typeof csvContent === "string" ? csvContent : csvContent.toString("utf-8");

  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(), // Trim header whitespace
  });

  const users: ParsedCSVUser[] = [];

  for (const row of results.data as any[]) {
    // Handle different possible column names (case-insensitive and with/without spaces)
    const fullName =
      row["Họ và tên đầy đủ"] ||
      row["Họ và tên"] ||
      row["fullName"] ||
      row["Full Name"] ||
      row["fullname"] ||
      row["FULLNAME"] ||
      "";
    const email = row["email"] || row["Email"] || row["EMAIL"] || "";
    const studentId =
      row["mã sinh viên"] ||
      row["Mã sinh viên"] ||
      row["studentId"] ||
      row["Student ID"] ||
      row["studentid"] ||
      row["STUDENTID"] ||
      "";
    const roleRaw =
      row["role"] || row["Role"] || row["ROLE"] || row["Vai trò"] || "";

    // Validate required fields
    if (!fullName.trim()) {
      throw new Error(`Dòng thiếu "Họ và tên đầy đủ": ${JSON.stringify(row)}`);
    }
    if (!email.trim()) {
      throw new Error(`Dòng thiếu "email": ${JSON.stringify(row)}`);
    }
    if (!roleRaw.trim()) {
      throw new Error(`Dòng thiếu "role": ${JSON.stringify(row)}`);
    }

    // Normalize role (case-insensitive)
    const roleUpper = roleRaw.trim().toUpperCase();
    let role: "STUDENT" | "ADVISOR" | "ADMIN";
    if (
      roleUpper === "STUDENT" ||
      roleUpper === "SINH VIÊN" ||
      roleUpper === "SV"
    ) {
      role = "STUDENT";
    } else if (
      roleUpper === "ADVISOR" ||
      roleUpper === "CỐ VẤN" ||
      roleUpper === "CV" ||
      roleUpper === "GIẢNG VIÊN"
    ) {
      role = "ADVISOR";
    } else if (roleUpper === "ADMIN" || roleUpper === "QUẢN TRỊ") {
      role = "ADMIN";
    } else {
      throw new Error(
        `Role không hợp lệ: "${roleRaw}". Chấp nhận: STUDENT, ADVISOR, ADMIN`
      );
    }

    users.push({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      studentId: studentId.trim() || undefined,
      role,
    });
  }

  return users;
}

/**
 * Parse CSV file (for browser/client-side use)
 */
export function parseCSVFile(file: File): Promise<ParsedCSVUser[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const users = parseCSVContent(csvContent);
        resolve(users);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Lỗi khi đọc file CSV"));
    };

    reader.readAsText(file, "UTF-8");
  });
}
