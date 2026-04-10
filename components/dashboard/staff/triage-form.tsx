"use client";

import { submitTriageAssessmentAction } from "@/features/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TriageFormProps = {
  caseId: string;
  returnPath: string;
};

function VitalField({
  id,
  label,
  unit,
  ...inputProps
}: {
  id: string;
  label: string;
  unit: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="text-xs text-muted-foreground">({unit})</span>
      </Label>
      <Input id={id} name={id} {...inputProps} />
    </div>
  );
}

export function TriageForm({ caseId, returnPath }: TriageFormProps) {
  return (
    <form action={submitTriageAssessmentAction} className="space-y-6">
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="caseId" value={caseId} />

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Blood Pressure</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <VitalField
            id="bp_systolic"
            label="Systolic"
            unit="mmHg"
            type="number"
            min={50}
            max={300}
            required
            placeholder="120"
          />
          <VitalField
            id="bp_diastolic"
            label="Diastolic"
            unit="mmHg"
            type="number"
            min={20}
            max={200}
            required
            placeholder="80"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Vitals</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <VitalField
            id="heart_rate"
            label="Heart Rate"
            unit="bpm"
            type="number"
            min={20}
            max={300}
            required
            placeholder="72"
          />
          <VitalField
            id="temperature_c"
            label="Temperature"
            unit="°C"
            type="number"
            min={30}
            max={45}
            step={0.1}
            required
            placeholder="36.5"
          />
          <VitalField
            id="weight_kg"
            label="Weight"
            unit="kg"
            type="number"
            min={10}
            max={500}
            step={0.1}
            required
            placeholder="70.0"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <VitalField
            id="height_cm"
            label="Height"
            unit="cm"
            type="number"
            min={50}
            max={300}
            step={0.1}
            required
            placeholder="170.0"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Vision</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vision_left">Left Eye</Label>
            <Input
              id="vision_left"
              name="vision_left"
              type="text"
              maxLength={20}
              defaultValue="20/20"
              placeholder="20/20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vision_right">Right Eye</Label>
            <Input
              id="vision_right"
              name="vision_right"
              type="text"
              maxLength={20}
              defaultValue="20/20"
              placeholder="20/20"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="observations">Observations (optional)</Label>
        <Textarea
          id="observations"
          name="observations"
          maxLength={1000}
          placeholder="Any additional nursing observations or notes."
        />
      </section>

      <Button type="submit" className="w-full sm:w-auto">
        Submit Triage Assessment
      </Button>
    </form>
  );
}
