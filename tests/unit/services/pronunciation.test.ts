/**
 * Pronunciation service tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  PronunciationService,
  getPronunciationService,
  resetPronunciationService,
  applyPronunciations,
} from "@/services/pronunciation.js";
import type { PronunciationRule } from "@/models/pronunciation.js";

describe("PronunciationService", () => {
  let service: PronunciationService;

  beforeEach(() => {
    service = new PronunciationService();
  });

  afterEach(() => {
    resetPronunciationService();
  });

  describe("apply", () => {
    test("should replace common acronyms", () => {
      const result = service.apply("The API is working");
      expect(result).toContain("A P I");
      expect(result).not.toContain("API");
    });

    test("should replace multiple acronyms in one text", () => {
      const result = service.apply("Check the API and CLI");
      expect(result).toContain("A P I");
      expect(result).toContain("C L I");
    });

    test("should handle case-insensitive matching", () => {
      const result1 = service.apply("Use the API");
      const result2 = service.apply("use the api");
      const result3 = service.apply("USE THE API");
      expect(result1).toContain("A P I");
      expect(result2).toContain("A P I");
      expect(result3).toContain("A P I");
    });

    test("should preserve word boundaries", () => {
      const result = service.apply("The apiculture is growing");
      expect(result).toBe("The apiculture is growing");
    });

    test("should return original text if no rules match", () => {
      const result = service.apply("Hello world");
      expect(result).toBe("Hello world");
    });

    test("should handle multi-word terms", () => {
      const customService = new PronunciationService([
        { term: "GitHub", pronunciation: "Git Hub" },
      ]);
      const result = customService.apply("Push to GitHub");
      expect(result).toContain("Git Hub");
    });
  });

  describe("addRule", () => {
    test("should add custom pronunciation rule", () => {
      service.addRule({ term: "Kubernetes", pronunciation: "Koo ber net ees" });
      const result = service.apply("Deploy to Kubernetes");
      expect(result).toContain("Koo ber net ees");
    });

    test("should override default rule", () => {
      service.addRule({ term: "API", pronunciation: "Application Programming Interface" });
      const result = service.apply("The API works");
      expect(result).toContain("Application Programming Interface");
      expect(result).not.toContain("A P I");
    });
  });

  describe("removeRule", () => {
    test("should remove custom rule", () => {
      service.addRule({ term: "Custom", pronunciation: "Cus tom" });
      let result = service.apply("This is Custom");
      expect(result).toContain("Cus tom");

      service.removeRule("Custom");
      result = service.apply("This is Custom");
      expect(result).toBe("This is Custom");
    });

    test("should handle removing non-existent rule gracefully", () => {
      expect(() => service.removeRule("NonExistent")).not.toThrow();
    });
  });

  describe("getRules", () => {
    test("should return all pronunciation rules", () => {
      const rules = service.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.term === "api")).toBe(true);
    });

    test("should include custom rules", () => {
      service.addRule({ term: "Test", pronunciation: "test pronunciation" });
      const rules = service.getRules();
      expect(rules.some(r => r.term === "test")).toBe(true);
    });
  });

  describe("reset", () => {
    test("should clear custom rules", () => {
      service.addRule({ term: "Custom", pronunciation: "Cus tom" });
      service.reset();
      const result = service.apply("This is Custom");
      expect(result).toBe("This is Custom");
    });

    test("should restore default rules after reset", () => {
      service.reset();
      const result = service.apply("Use the API");
      expect(result).toContain("A P I");
    });
  });

  describe("constructor with custom rules", () => {
    test("should accept custom rules on initialization", () => {
      const customService = new PronunciationService([
        { term: "Docker", pronunciation: "Docker" },
      ]);
      const result = customService.apply("Use Docker");
      expect(result).toContain("Docker");
    });
  });
});

describe("getPronunciationService", () => {
  afterEach(() => {
    resetPronunciationService();
  });

  test("should return singleton instance", () => {
    const service1 = getPronunciationService();
    const service2 = getPronunciationService();
    expect(service1).toBe(service2);
  });

  test("should create service with custom rules", () => {
    const service = getPronunciationService([{ term: "Test", pronunciation: "test" }]);
    const result = service.apply("This is a Test");
    expect(result).toContain("test");
  });
});

describe("applyPronunciations", () => {
  afterEach(() => {
    resetPronunciationService();
  });

  test("should apply pronunciations with custom rules", () => {
    const result = applyPronunciations("Check the API", [
      { term: "API", pronunciation: "A P I Custom" },
    ]);
    expect(result).toContain("A P I Custom");
  });

  test("should use default rules when no custom rules provided", () => {
    const result = applyPronunciations("Check the API");
    expect(result).toContain("A P I");
  });
});
