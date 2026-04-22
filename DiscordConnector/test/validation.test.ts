import { ValidationError } from "../src/errors";
import { requiredSnowflake } from "../src/PublicAPI/validation";

describe("PublicAPI validation", () => {
  it("accepts snowflakes only as digit strings", () => {
    expect(requiredSnowflake({ id: "1492893356760764400" }, "id")).toBe("1492893356760764400");
    expect(() => requiredSnowflake({ id: 1492893356760764400 }, "id")).toThrow(ValidationError);
    expect(() => requiredSnowflake({ id: "abc" }, "id")).toThrow(ValidationError);
  });
});
