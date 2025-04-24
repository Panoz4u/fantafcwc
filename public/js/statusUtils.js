// public/js/statusUtils.js

export async function checkContestStatus(contestId) {
  try {
    const resp = await fetch(`/contest-details?contest=${contestId}`);
    if (!resp.ok) throw new Error("Errore nel recupero dei dettagli");
    const data = await resp.json();
    return data.contest.status;
  } catch (e) {
    console.error("checkContestStatus:", e);
    return null;
  }
}

export function showErrorMessage(message) {
  const div = document.getElementById("errorMessage");
  if (!div) return;
  div.textContent = message;
  div.style.display = "block";
  setTimeout(() => { div.style.display = "none"; }, 3000);
}
