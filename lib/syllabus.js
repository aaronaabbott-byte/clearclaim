// Syllabus PDF export + a no-AI template draft, shared by the builder and API.

// A reasonable starter draft with no AI, from a few inputs. Returned when there's
// no API key, or as the instant default before the parent asks for AI.
export function localSyllabusDraft({ title, subject, grade, term, materials, level, weeks, sessions_per_week }) {
  const gr = grade ? `grade ${grade}` : "this grade level";
  const subj = subject || title || "this subject";
  const mats = materials || "the selected curriculum and supporting resources";
  const lvl = level ? `${level.toLowerCase()}-level ` : "";
  const wk = weeks ? `${weeks}-week ` : "";
  const cadence = sessions_per_week ? ` It meets ${sessions_per_week} session(s) per week.` : "";
  return {
    description:
      `${title || subj} is a ${wk}${lvl}${gr} course for the ${term || "current"} school year. It provides structured, ` +
      `sequential instruction in ${subj}, building skills through regular lessons, practice, and review using ${mats}.${cadence}`,
    objectives:
      `By the end of the course the student will be able to:\n` +
      `• Demonstrate core knowledge and vocabulary of ${subj}.\n` +
      `• Apply key skills through regular practice and graded work.\n` +
      `• Complete assignments and assessments that show measurable progress.\n` +
      `• Connect what they learn to broader ${subj} concepts appropriate for ${gr}.`,
    standards:
      `Aligned to ${gr} academic standards and subject-area skills for ${subj}. ` +
      `Content and pacing follow the scope and sequence of ${mats}.`,
    materials: mats,
    schedule:
      `Weeks 1–3: Foundations and vocabulary.\n` +
      `Weeks 4–9: Core units with weekly lessons, practice, and checks for understanding.\n` +
      `Weeks 10–15: Application, projects, and cumulative review.\n` +
      `Weeks 16–18: Assessment, reteaching as needed, and end-of-term evaluation.`,
    assessment:
      `Progress is measured through weekly assignments, unit quizzes, a project or written work, ` +
      `and an end-of-term assessment. Work is kept in a portfolio as evidence of learning.`,
  };
}

function section(doc, W, M, yRef, heading, body, colors) {
  const { navy, ink, muted } = colors;
  const H = doc.internal.pageSize.getHeight();
  let y = yRef.y;
  if (!body || !String(body).trim()) return;
  if (y > H - 90) { doc.addPage(); y = M; }
  doc.setFont("times", "bold"); doc.setFontSize(13); doc.setTextColor(...navy);
  doc.text(heading, M, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...ink);
  const lines = doc.splitTextToSize(String(body).replace(/\r/g, ""), W - M * 2);
  for (const ln of lines) {
    if (y > H - M) { doc.addPage(); y = M; }
    doc.text(ln, M, y); y += 14;
  }
  y += 10;
  yRef.y = y;
}

export async function buildSyllabusPdf(syl, kid, provider) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const colors = { navy: [22, 50, 78], gold: [198, 138, 28], ink: [30, 34, 42], muted: [113, 118, 127] };

  const yRef = { y: 100 };

  if (provider && (provider.business_name || provider.provider_name || provider.logoDataUrl)) {
    // Branded provider letterhead: logo, business name, provider + credentials, contact.
    let x = M, headTop = 40, textX = M;
    if (provider.logoDataUrl) {
      try {
        const props = doc.getImageProperties(provider.logoDataUrl);
        const maxW = 120, maxH = 54;
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        const w = props.width * ratio, h = props.height * ratio;
        doc.addImage(provider.logoDataUrl, props.fileType || "PNG", M, 34, w, h);
        textX = M + w + 16;
      } catch { /* bad image — skip logo */ }
    }
    let ly = 46;
    doc.setFont("times", "bold"); doc.setFontSize(18); doc.setTextColor(...colors.navy);
    doc.text(provider.business_name || provider.provider_name || "", textX, ly); ly += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...colors.ink);
    const who = [provider.provider_name, provider.credentials].filter(Boolean).join(", ");
    if (who) { doc.text(who, textX, ly); ly += 13; }
    const contact = [provider.contact_email, provider.contact_phone, provider.contact_website].filter(Boolean).join("   ·   ");
    if (contact) { doc.setFontSize(9.5); doc.setTextColor(...colors.muted); doc.text(contact, textX, ly); ly += 12; }
    const bandBottom = Math.max(ly, 96) + 4;
    doc.setDrawColor(...colors.gold); doc.setLineWidth(1.5);
    doc.line(M, bandBottom, W - M, bandBottom);
    // Course title under the letterhead.
    let ty = bandBottom + 26;
    doc.setFont("times", "bold"); doc.setFontSize(17); doc.setTextColor(...colors.navy);
    doc.text(syl.title || "Course Syllabus", M, ty); ty += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...colors.muted);
    const bmeta = [syl.subject, syl.term, syl.grade ? `Grade ${syl.grade}` : null].filter(Boolean).join("   ·   ");
    if (bmeta) { doc.text(bmeta, M, ty); ty += 14; }
    yRef.y = ty + 12;
  } else {
    // Default ClearClaim navy title bar (parent view).
    doc.setFillColor(...colors.navy);
    doc.rect(0, 0, W, 74, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold"); doc.setFontSize(20);
    doc.text(syl.title || "Course Syllabus", M, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(214, 224, 240);
    const meta = [
      kid ? `${kid.first_name}${kid.grade ? `, grade ${kid.grade}` : ""}` : null,
      syl.subject, syl.term,
    ].filter(Boolean).join("  ·  ");
    doc.text(meta, M, 58);
  }

  doc.setTextColor(...colors.muted); doc.setFontSize(9.5); doc.setFont("helvetica", "normal");
  const line2 = [
    syl.level ? syl.level : null,
    syl.weeks ? `${syl.weeks} weeks` : null,
    syl.sessions_per_week ? `${syl.sessions_per_week}×/week` : null,
    syl.instructor ? `Instructor: ${syl.instructor}` : null,
    kid && kid.school_name ? kid.school_name : (kid && kid.setting === "homeschool" ? "Homeschool" : null)]
    .filter(Boolean).join("   ·   ");
  if (line2) { doc.text(line2, M, yRef.y); yRef.y += 18; }

  section(doc, W, M, yRef, "Course Description", syl.description, colors);
  section(doc, W, M, yRef, "Learning Objectives", syl.objectives, colors);
  section(doc, W, M, yRef, "Standards & Skills Alignment", syl.standards, colors);
  section(doc, W, M, yRef, "Materials & Curriculum", syl.materials, colors);
  section(doc, W, M, yRef, "Course Schedule", syl.schedule, colors);
  section(doc, W, M, yRef, "Assessment & Grading", syl.assessment, colors);

  const H = doc.internal.pageSize.getHeight();
  doc.setTextColor(...colors.muted); doc.setFontSize(9);
  doc.text("Prepared with ClearClaim — documentation of educational use.", M, H - 28);
  return doc;
}
