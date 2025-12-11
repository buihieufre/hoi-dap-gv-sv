/**
 * Unit Tests for Slug Utility
 */

import { generateSlug } from "@/shared/utils/slug";

describe("Slug Utility", () => {
  describe("generateSlug", () => {
    describe("Basic Functionality", () => {
      it("should convert text to lowercase", () => {
        const result = generateSlug("Hello World");
        expect(result).toBe("hello-world");
      });

      it("should replace spaces with hyphens", () => {
        const result = generateSlug("hello world test");
        expect(result).toBe("hello-world-test");
      });

      it("should handle empty string", () => {
        const result = generateSlug("");
        expect(result).toBe("");
      });

      it("should handle null/undefined input", () => {
        const result = generateSlug(null as any);
        expect(result).toBe("");

        const result2 = generateSlug(undefined as any);
        expect(result2).toBe("");
      });

      it("should remove leading and trailing hyphens", () => {
        const result = generateSlug("  hello world  ");
        expect(result).not.toMatch(/^-/);
        expect(result).not.toMatch(/-$/);
        expect(result).toBe("hello-world");
      });

      it("should replace multiple spaces with single hyphen", () => {
        const result = generateSlug("hello    world");
        expect(result).toBe("hello-world");
        expect(result).not.toContain("--");
      });
    });

    describe("Vietnamese Character Handling", () => {
      it("should convert Vietnamese lowercase characters", () => {
        expect(generateSlug("học vụ")).toBe("hoc-vu");
        expect(generateSlug("câu hỏi")).toBe("cau-hoi");
        expect(generateSlug("đăng nhập")).toBe("dang-nhap");
      });

      it("should convert Vietnamese uppercase characters", () => {
        expect(generateSlug("HỌC VỤ")).toBe("hoc-vu");
        expect(generateSlug("CÂU HỎI")).toBe("cau-hoi");
        expect(generateSlug("ĐĂNG NHẬP")).toBe("dang-nhap");
      });

      it("should handle mixed Vietnamese and English", () => {
        const result = generateSlug("Test học vụ category");
        expect(result).toBe("test-hoc-vu-category");
      });

      it("should handle various Vietnamese vowels with diacritics", () => {
        expect(generateSlug("à á ạ ả ã")).toBe("a-a-a-a-a");
        expect(generateSlug("â ầ ấ ậ ẩ ẫ")).toBe("a-a-a-a-a-a");
        expect(generateSlug("ă ằ ắ ặ ẳ ẵ")).toBe("a-a-a-a-a-a");
        expect(generateSlug("è é ẹ ẻ ẽ")).toBe("e-e-e-e-e");
        expect(generateSlug("ê ề ế ệ ể ễ")).toBe("e-e-e-e-e-e");
        expect(generateSlug("ì í ị ỉ ĩ")).toBe("i-i-i-i-i");
        expect(generateSlug("ò ó ọ ỏ õ")).toBe("o-o-o-o-o");
        expect(generateSlug("ô ồ ố ộ ổ ỗ")).toBe("o-o-o-o-o-o");
        expect(generateSlug("ơ ờ ớ ợ ở ỡ")).toBe("o-o-o-o-o-o");
        expect(generateSlug("ù ú ụ ủ ũ")).toBe("u-u-u-u-u");
        expect(generateSlug("ư ừ ứ ự ử ữ")).toBe("u-u-u-u-u-u");
        expect(generateSlug("ỳ ý ỵ ỷ ỹ")).toBe("y-y-y-y-y");
        expect(generateSlug("đ Đ")).toBe("d-d");
      });
    });

    describe("Special Characters Handling", () => {
      it("should remove special characters", () => {
        const result = generateSlug("test@#$%^&*()test");
        expect(result).toBe("testtest");
      });

      it("should remove punctuation", () => {
        const result = generateSlug("hello, world! how are you?");
        expect(result).toBe("hello-world-how-are-you");
      });

      it("should handle brackets and parentheses", () => {
        const result = generateSlug("test (example) [demo]");
        expect(result).toBe("test-example-demo");
      });

      it("should handle string with only special characters", () => {
        const result = generateSlug("@#$%^&*()");
        expect(result).toBe("");
      });

      it("should preserve hyphens in original text", () => {
        const result = generateSlug("already-slugified");
        expect(result).toBe("already-slugified");
      });

      it("should collapse multiple hyphens into one", () => {
        const result = generateSlug("test---multiple---hyphens");
        expect(result).toBe("test-multiple-hyphens");
      });
    });

    describe("Numbers Handling", () => {
      it("should preserve numbers", () => {
        const result = generateSlug("test 123 test");
        expect(result).toBe("test-123-test");
      });

      it("should handle numeric only input", () => {
        const result = generateSlug("12345");
        expect(result).toBe("12345");
      });

      it("should handle mixed alphanumeric", () => {
        const result = generateSlug("test123test456");
        expect(result).toBe("test123test456");
      });
    });

    describe("Real-World Category Names", () => {
      it("should generate slug for academic categories", () => {
        expect(generateSlug("Học vụ")).toBe("hoc-vu");
        expect(generateSlug("Học phí")).toBe("hoc-phi");
        expect(generateSlug("Đăng ký học phần")).toBe("dang-ky-hoc-phan");
        expect(generateSlug("Thực tập tốt nghiệp")).toBe("thuc-tap-tot-nghiep");
      });

      it("should generate slug for question titles", () => {
        expect(generateSlug("Làm thế nào để đăng ký môn học?")).toBe(
          "lam-the-nao-de-dang-ky-mon-hoc"
        );
        expect(generateSlug("Cách nộp học phí online")).toBe(
          "cach-nop-hoc-phi-online"
        );
      });

      it("should generate slug for common UI elements", () => {
        expect(generateSlug("Đăng nhập")).toBe("dang-nhap");
        expect(generateSlug("Đăng ký")).toBe("dang-ky");
        expect(generateSlug("Đăng xuất")).toBe("dang-xuat");
        expect(generateSlug("Câu hỏi thường gặp")).toBe("cau-hoi-thuong-gap");
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long text", () => {
        const longText =
          "This is a very long title that should still produce a valid slug even though it has many words and is quite lengthy";
        const result = generateSlug(longText);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toContain(" ");
      });

      it("should handle text with consecutive special characters and spaces", () => {
        const result = generateSlug("test   @#$   test");
        expect(result).toBe("test-test");
      });

      it("should handle underscore", () => {
        const result = generateSlug("test_underscore_text");
        expect(result).toBe("test_underscore_text");
      });

      it("should handle emoji by removing them", () => {
        const result = generateSlug("test 🎉 emoji");
        expect(result).toBeDefined();
        expect(result).not.toContain("🎉");
      });

      it("should handle text starting with special characters", () => {
        const result = generateSlug("!@#hello world");
        expect(result).toBe("hello-world");
      });

      it("should handle text ending with special characters", () => {
        const result = generateSlug("hello world!@#");
        expect(result).toBe("hello-world");
      });
    });

    describe("URL Safety", () => {
      it("should generate URL-safe slugs", () => {
        const testCases = [
          "Test@Special#Characters",
          "Học vụ & Đăng ký",
          "Question (FAQ)",
          "Test/Slash",
        ];

        testCases.forEach((text) => {
          const result = generateSlug(text);
          // URL-safe: only lowercase letters, numbers, hyphens, and underscores
          expect(result).toMatch(/^[a-z0-9_-]*$/);
        });
      });

      it("should not produce double hyphens", () => {
        const testCases = [
          "test  double  space",
          "test--double--hyphen",
          "test @ special @ chars",
        ];

        testCases.forEach((text) => {
          const result = generateSlug(text);
          expect(result).not.toContain("--");
        });
      });

      it("should not start or end with hyphen", () => {
        const testCases = [
          " leading space",
          "trailing space ",
          " both spaces ",
          "-leading-hyphen",
          "trailing-hyphen-",
        ];

        testCases.forEach((text) => {
          const result = generateSlug(text);
          if (result) {
            expect(result[0]).not.toBe("-");
            expect(result[result.length - 1]).not.toBe("-");
          }
        });
      });
    });
  });
});
