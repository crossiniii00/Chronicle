
## strict_rule_modal_routing
When modifying or opening a candidate's profile data modal in the Applicant Management module, ALWAYS ensure the code automatically opens/routes to the applicant's current step in the application process instead of defaulting to the Candidate Profile (unless they are new and just applied). The `getInitialTabForApplicant` function must properly resolve ALL new sub-statuses (e.g. RESCHEDULED, NO SHOW) to their original step tab.
