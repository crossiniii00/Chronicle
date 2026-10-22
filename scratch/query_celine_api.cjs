async function queryCeline() {
  const req = await fetch('http://localhost:3000/api/applications/all');
  const applications = await req.json();
  const celines = applications.filter(a => a.applicant_name && a.applicant_name.includes('Celine'));
  console.log(JSON.stringify(celines.map(c => ({
    name: c.applicant_name,
    department: c.department,
    master_column: c.master_column,
    master_status: c.master_status,
    endorsement_account: c.endorsement_account,
    pis: c.pis ? { final_account: c.pis.final_account } : null
  })), null, 2));
}
queryCeline();
