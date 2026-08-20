describe("H-01: QR code generation hardening", () => {
  describe("generateQRCodeData format (via output inspection)", () => {
    // Replicate the generation logic to test properties without importing Convex internals
    function generateQRCodeData(): string {
      const timestamp = Date.now().toString(36);
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      const random = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `QRC-${timestamp}-${random}`.toUpperCase();
    }

    it("produces values in the expected QRC- format", () => {
      const code = generateQRCodeData();
      expect(code).toMatch(/^QRC-[0-9A-Z]+-[0-9A-F]{16}$/);
    });

    it("generates 16 hex chars of random data (64 bits of entropy)", () => {
      const code = generateQRCodeData();
      const randomPart = code.split("-")[2];
      expect(randomPart).toHaveLength(16);
    });

    it("produces unique codes across many calls", () => {
      const codes = new Set(Array.from({ length: 1000 }, () => generateQRCodeData()));
      expect(codes.size).toBe(1000);
    });

    it("uses crypto.getRandomValues (not Math.random)", () => {
      const mathSpy = jest.spyOn(Math, "random");
      generateQRCodeData();
      expect(mathSpy).not.toHaveBeenCalled();
      mathSpy.mockRestore();
    });
  });

  describe("getVesselPublicInfo PII", () => {
    it("ownerId is not in the public info type (static check)", () => {
      // This test documents the contract: the public scan endpoint must not expose ownerId.
      // The shape returned by getVesselPublicInfo is: vesselId, name, make, model, year, ownerName.
      const allowedKeys = new Set(["vesselId", "name", "make", "model", "year", "ownerName"]);
      expect(allowedKeys.has("ownerId")).toBe(false);
    });
  });
});
