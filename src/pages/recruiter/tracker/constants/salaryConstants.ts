export interface SalaryEntry {
    level?: string;
    position: string;
    experience: string;
    salary: string;
    incentives: string;
    total?: string;
}

export interface Tier {
    name: string;
    entries: SalaryEntry[];
}

export interface AccountSalary {
    account: string;
    tiers: Tier[];
}

export const SALARY_DATA: AccountSalary[] = [
    {
        account: "Accuhealth",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" },
                    { position: "Sales Agent", experience: "0-1.5 year", salary: "₱20,000.00", incentives: "-" },
                    { position: "Sales Agent", experience: "2 years and Up", salary: "₱25,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱20,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱23,000.00", incentives: "-" },
                    { position: "Sales Agent", experience: "0-1.5 year", salary: "₱25,000.00", incentives: "-" },
                    { position: "Sales Agent", experience: "2 years and Up", salary: "₱30,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "Flair",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" },
                    { position: "Escalations", experience: "0-1.5 year", salary: "₱18,000.00", incentives: "₱3,000.00" },
                    { position: "Escalations", experience: "2 years and Up", salary: "₱20,000.00", incentives: "₱3,000.00" },
                    { position: "RTA", experience: "0-1.5 year", salary: "₱23,000.00", incentives: "-" },
                    { position: "RTA", experience: "2 years and Up", salary: "₱25,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱20,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱23,000.00", incentives: "-" },
                    { position: "Escalations", experience: "0-1.5 year", salary: "₱20,000.00", incentives: "₱3,000.00" },
                    { position: "Escalations", experience: "2 years and Up", salary: "₱23,000.00", incentives: "₱3,000.00" },
                    { position: "RTA", experience: "0-1.5 year", salary: "₱25,000.00", incentives: "-" },
                    { position: "RTA", experience: "2 years and Up", salary: "₱28,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "iWireless",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱17,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱19,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "Loss Express",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "NJS",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 mos", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "6 mos - 1.5 years", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱19,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "TFG",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱20,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱28,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "Riipen",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "StandUp Non-Voice",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-1.5 year", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "0-1.5 year", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "StandUp Voice",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "6 mos - 1 year", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "1 year to 1.5 years", salary: "₱20,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱22,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "DoorDash",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "1.5 years and Up", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "Purolator",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱16,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱17,000.00", incentives: "-" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱18,000.00", incentives: "-" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "1.5 years and Up", salary: "₱18,000.00", incentives: "-" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱20,000.00", incentives: "-" }
                ]
            }
        ]
    },
    {
        account: "Keller Postman",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱20,000.00", incentives: "₱5,000.00", total: "₱25,000.00" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱21,000.00", incentives: "₱5,000.00", total: "₱26,000.00" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱22,000.00", incentives: "₱5,000.00", total: "₱27,000.00" },
                    { position: "Agent/CSR", experience: "2 years and Up", salary: "₱23,000.00", incentives: "₱5,000.00", total: "₱28,000.00" },
                    { position: "Agent/CSR/SME", experience: "3 years and Up", salary: "₱24,000.00", incentives: "₱5,000.00", total: "₱29,000.00" },
                    { position: "Agent/CSR/SME", experience: "4 years and Up", salary: "₱25,000.00", incentives: "₱5,000.00", total: "₱30,000.00" }
                ]
            }
        ]
    },
    {
        account: "Exact Sciences | Health Care",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱20,000.00", incentives: "-", total: "₱20,000.00" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱21,000.00", incentives: "-", total: "₱21,000.00" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱22,000.00", incentives: "-", total: "₱22,000.00" }
                ]
            },
            {
                name: "Tier 2",
                entries: [
                    { position: "Agent/CSR/SME", experience: "1.5 years and Up", salary: "₱20,000.00", incentives: "-", total: "₱20,000.00" },
                    { position: "Agent/CSR/SME", experience: "2 years and Up", salary: "₱22,000.00", incentives: "-", total: "₱22,000.00" }
                ]
            }
        ]
    },
    {
        account: "Regency | Claims Specialist",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱23,000.00", incentives: "₱5,000.00", total: "₱28,000.00" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱24,000.00", incentives: "₱5,000.00", total: "₱29,000.00" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱25,000.00", incentives: "₱5,000.00", total: "₱30,000.00" }
                ]
            }
        ]
    },
    {
        account: "Regency | Team Leader",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "Agent/CSR", experience: "0-5 months", salary: "₱35,000.00", incentives: "₱5,000.00", total: "₱40,000.00" },
                    { position: "Agent/CSR", experience: "6 months - 1 yr", salary: "₱38,000.00", incentives: "₱5,000.00", total: "₱43,000.00" },
                    { position: "Agent/CSR", experience: "1.5 years and Up", salary: "₱40,000.00", incentives: "₱5,000.00", total: "₱45,000.00" }
                ]
            }
        ]
    },
    {
        account: "Quality Assurance Analyst",
        tiers: [
            {
                name: "Tier 1",
                entries: [
                    { position: "QAA", experience: "Internal SME", salary: "₱20,000.00", incentives: "₱5,000.00", total: "₱25,000.00" },
                    { position: "QAA", experience: "External Exp.", salary: "₱25,000.00", incentives: "₱5,000.00", total: "₱30,000.00" }
                ]
            }
        ]
    },
    {
        account: "Corporate Roles",
        tiers: [
            {
                name: "Management",
                entries: [
                    { position: "Team Manager", experience: "Minimum Exp.", salary: "₱45,000.00", incentives: "₱10,000.00", total: "₱55,000.00" },
                    { position: "Ops Manager", experience: "Minimum Exp.", salary: "₱80,000.00", incentives: "₱15,000.00", total: "₱95,000.00" }
                ]
            }
        ]
    }
];
