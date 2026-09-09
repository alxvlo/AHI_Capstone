import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NativeSelect } from "@/components/ui/native-select";

describe("NativeSelect", () => {
  it("renders a native select that forwards name, id, defaultValue and required", () => {
    render(
      <NativeSelect id="sex" name="sex" defaultValue="Female" required>
        <option value="">Select sex</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </NativeSelect>
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.name).toBe("sex");
    expect(select.id).toBe("sex");
    expect(select.value).toBe("Female");
    expect(select.required).toBe(true);
  });

  it("merges a caller className without dropping the base border class", () => {
    render(
      <NativeSelect name="x" className="h-11">
        <option value="">-</option>
      </NativeSelect>
    );
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("h-11");
    expect(select.className).toContain("border-input");
    expect(select.className).not.toContain("h-10");
  });

  it("is disabled when told to", () => {
    render(
      <NativeSelect name="x" disabled>
        <option value="">-</option>
      </NativeSelect>
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
