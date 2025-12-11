/**
 * Unit Tests for CSV Parser Utility
 */

import { parseCSVContent, ParsedCSVUser } from "@/shared/utils/csv-parser";
import { createValidCSVContent, createInvalidCSVContent } from "@/tests/mocks/test-data";

describe("CSV Parser Utility", () => {
  describe("parseCSVContent", () => {
    describe("Valid CSV Parsing", () => {
      it("should parse valid CSV content with Vietnamese headers", () => {
        const csvContent = `Họ và tên đầy đủ,email,mã sinh viên,role
Nguyễn Văn A,nguyenvana@example.com,SV001,STUDENT
Trần Thị B,tranthib@example.com,SV002,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          fullName: "Nguyễn Văn A",
          email: "nguyenvana@example.com",
          studentId: "SV001",
          role: "STUDENT",
        });
        expect(result[1]).toEqual({
          fullName: "Trần Thị B",
          email: "tranthib@example.com",
          studentId: "SV002",
          role: "STUDENT",
        });
      });

      it("should parse CSV with English headers", () => {
        const csvContent = `fullName,email,studentId,role
John Doe,john@example.com,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(1);
        expect(result[0].fullName).toBe("John Doe");
        expect(result[0].email).toBe("john@example.com");
      });

      it("should normalize email to lowercase", () => {
        const csvContent = `fullName,email,studentId,role
Test User,TEST@EXAMPLE.COM,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result[0].email).toBe("test@example.com");
      });

      it("should trim whitespace from all fields", () => {
        const csvContent = `fullName,email,studentId,role
  Test User  ,  test@example.com  ,  SV001  ,  STUDENT  `;

        const result = parseCSVContent(csvContent);

        expect(result[0].fullName).toBe("Test User");
        expect(result[0].email).toBe("test@example.com");
        expect(result[0].studentId).toBe("SV001");
      });

      it("should handle empty studentId", () => {
        const csvContent = `fullName,email,studentId,role
Advisor User,advisor@example.com,,ADVISOR`;

        const result = parseCSVContent(csvContent);

        expect(result[0].studentId).toBeUndefined();
        expect(result[0].role).toBe("ADVISOR");
      });

      it("should skip empty lines", () => {
        const csvContent = `fullName,email,studentId,role
User 1,user1@example.com,SV001,STUDENT

User 2,user2@example.com,SV002,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(2);
      });

      it("should parse Buffer input", () => {
        const csvContent = Buffer.from(`fullName,email,studentId,role
Test User,test@example.com,SV001,STUDENT`, "utf-8");

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(1);
        expect(result[0].fullName).toBe("Test User");
      });
    });

    describe("Role Normalization", () => {
      it("should normalize STUDENT role variations", () => {
        const csvContent = `fullName,email,studentId,role
User1,user1@example.com,SV001,STUDENT
User2,user2@example.com,SV002,student
User3,user3@example.com,SV003,Sinh viên
User4,user4@example.com,SV004,SV`;

        const result = parseCSVContent(csvContent);

        result.forEach((user) => {
          expect(user.role).toBe("STUDENT");
        });
      });

      it("should normalize ADVISOR role variations", () => {
        const csvContent = `fullName,email,studentId,role
Advisor1,a1@example.com,,ADVISOR
Advisor2,a2@example.com,,advisor
Advisor3,a3@example.com,,Cố vấn
Advisor4,a4@example.com,,CV
Advisor5,a5@example.com,,Giảng viên`;

        const result = parseCSVContent(csvContent);

        result.forEach((user) => {
          expect(user.role).toBe("ADVISOR");
        });
      });

      it("should normalize ADMIN role variations", () => {
        const csvContent = `fullName,email,studentId,role
Admin1,admin1@example.com,,ADMIN
Admin2,admin2@example.com,,admin
Admin3,admin3@example.com,,Quản trị`;

        const result = parseCSVContent(csvContent);

        result.forEach((user) => {
          expect(user.role).toBe("ADMIN");
        });
      });
    });

    describe("Header Variations", () => {
      it("should handle case variations in headers", () => {
        const csvContent = `FULLNAME,EMAIL,STUDENTID,ROLE
Test User,test@example.com,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(1);
        expect(result[0].fullName).toBe("Test User");
      });

      it("should handle alternative Vietnamese headers", () => {
        const csvContent = `Họ và tên,Email,Mã sinh viên,Vai trò
Test User,test@example.com,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(1);
        expect(result[0].fullName).toBe("Test User");
      });

      it("should handle Full Name header", () => {
        const csvContent = `Full Name,email,Student ID,role
Test User,test@example.com,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result[0].fullName).toBe("Test User");
      });
    });

    describe("Validation Errors", () => {
      it("should throw error when fullName is missing", () => {
        const csvContent = `fullName,email,studentId,role
,test@example.com,SV001,STUDENT`;

        expect(() => parseCSVContent(csvContent)).toThrow(
          /thiếu "Họ và tên đầy đủ"/
        );
      });

      it("should throw error when email is missing", () => {
        const csvContent = `fullName,email,studentId,role
Test User,,SV001,STUDENT`;

        expect(() => parseCSVContent(csvContent)).toThrow(/thiếu "email"/);
      });

      it("should throw error when role is missing", () => {
        const csvContent = `fullName,email,studentId,role
Test User,test@example.com,SV001,`;

        expect(() => parseCSVContent(csvContent)).toThrow(/thiếu "role"/);
      });

      it("should throw error for invalid role", () => {
        const csvContent = `fullName,email,studentId,role
Test User,test@example.com,SV001,INVALID_ROLE`;

        expect(() => parseCSVContent(csvContent)).toThrow(
          /Role không hợp lệ.*INVALID_ROLE/
        );
      });

      it("should include row data in error message", () => {
        const csvContent = `fullName,email,studentId,role
,missing@example.com,SV001,STUDENT`;

        expect(() => parseCSVContent(csvContent)).toThrow(/missing@example.com/);
      });
    });

    describe("Edge Cases", () => {
      it("should handle CSV with only headers", () => {
        const csvContent = `fullName,email,studentId,role`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(0);
      });

      it("should handle CSV with many users", () => {
        const users = Array.from({ length: 100 }, (_, i) => 
          `User ${i + 1},user${i + 1}@example.com,SV${String(i + 1).padStart(3, "0")},STUDENT`
        ).join("\n");
        const csvContent = `fullName,email,studentId,role\n${users}`;

        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(100);
      });

      it("should handle special characters in names", () => {
        const csvContent = `fullName,email,studentId,role
Nguyễn Văn Đức,duc@example.com,SV001,STUDENT
José García,jose@example.com,SV002,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result[0].fullName).toBe("Nguyễn Văn Đức");
        expect(result[1].fullName).toBe("José García");
      });

      it("should handle quoted fields with commas", () => {
        const csvContent = `fullName,email,studentId,role
"Nguyen, Van A",test@example.com,SV001,STUDENT`;

        const result = parseCSVContent(csvContent);

        expect(result[0].fullName).toBe("Nguyen, Van A");
      });

      it("should handle mixed role cases within same file", () => {
        const csvContent = `fullName,email,studentId,role
Student,s@example.com,SV001,STUDENT
Advisor,a@example.com,,ADVISOR
Admin,admin@example.com,,ADMIN`;

        const result = parseCSVContent(csvContent);

        expect(result[0].role).toBe("STUDENT");
        expect(result[1].role).toBe("ADVISOR");
        expect(result[2].role).toBe("ADMIN");
      });
    });

    describe("Using Test Data Factories", () => {
      it("should parse valid CSV from test factory", () => {
        const csvContent = createValidCSVContent();
        const result = parseCSVContent(csvContent);

        expect(result).toHaveLength(3);
        expect(result[0].role).toBe("STUDENT");
        expect(result[2].role).toBe("ADVISOR");
      });

      it("should fail on invalid CSV from test factory", () => {
        const csvContent = createInvalidCSVContent();

        expect(() => parseCSVContent(csvContent)).toThrow();
      });
    });
  });
});

