// Preset homeschool compliance items families check off each school year.
// Dates shown are guidance from program materials — families verify with ADE.
export const COMPLIANCE_ITEMS = [
  { key: "noi", title: "File your Notice of Intent (NOI)", when: "Confirm the current deadline with ADE",
    detail: "Submit your Notice of Intent to homeschool to the Arkansas Department of Education for this school year." },
  { key: "test_schedule", title: "Schedule the standardized test", when: "After March 1",
    detail: "Testing for the year can be scheduled after March 1. Book it early so it's done by the submission date." },
  { key: "test_scores", title: "Submit standardized test scores", when: "By June 30",
    detail: "Turn in your student's standardized test scores for the year." },
  { key: "survey", title: "Complete the yearly survey", when: "Confirm timing with ADE",
    detail: "Complete the annual homeschool survey if you're asked to." },
];

// School year label (Jul–Jun), used as the per-year key.
export function schoolYearLabel(d = new Date()) {
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}
