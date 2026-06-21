export interface DemoCharacter {
    full_name: string;
    nick_name: string;
    email: string;
    company: string;
    position: string;
    description: string;
    gender: 'Male' | 'Female' | 'Other';
}

export const DEMO_CHARACTERS: DemoCharacter[] = [
    // FromSoftware
    {
        full_name: 'Arthur Morgan',
        nick_name: 'Art',
        email: 'arthur.morgan@van-der-linde.com',
        company: 'Van der Linde Gang',
        position: 'Enforcer',
        description: 'Managed camp security, collected outstanding debts, and coordinated heavy transport logistics in frontier environments.',
        gender: 'Male'
    },
    {
        full_name: 'John Marston',
        nick_name: 'Johnny',
        email: 'john.marston@beechershope.com',
        company: 'Marston Ranching',
        position: 'Operations Manager',
        description: 'Oversaw daily agricultural operations, livestock transportation, and property maintenance in demanding rural settings.',
        gender: 'Male'
    },
    {
        full_name: 'Carl Johnson',
        nick_name: 'CJ',
        email: 'cj.johnson@grovestreet.com',
        company: 'Grove Street Families',
        position: 'Logistics Supervisor',
        description: 'Coordinated territories, managed asset acquisition, and oversaw transport logistics across Los Santos, San Fierro, and Las Venturas.',
        gender: 'Male'
    },
    {
        full_name: 'Niko Bellic',
        nick_name: 'Niko',
        email: 'niko.bellic@broker-cabs.com',
        company: 'Roman Cab Services',
        position: 'Senior Dispatcher',
        description: 'Assisted in VIP transport, fleet dispatching, and handled resolution of difficult customer interactions in Liberty City.',
        gender: 'Male'
    },
    {
        full_name: 'Trevor Philips',
        nick_name: 'Trevor',
        email: 'trevor@trevorphilipsindustries.com',
        company: 'Trevor Philips Industries',
        position: 'Chief Executive Officer',
        description: 'Directed import-export distribution chains, conducted strategic negotiations, and supervised hazardous materials transport.',
        gender: 'Male'
    },
    {
        full_name: 'Michael De Santa',
        nick_name: 'Mike',
        email: 'michael.desanta@rockfordhills.com',
        company: 'De Santa Productions',
        position: 'Executive Producer',
        description: 'Managed large budgets, coordinated complex project schedules, and directed large creative teams for entertainment media.',
        gender: 'Male'
    },
    {
        full_name: 'Franklin Clinton',
        nick_name: 'Frank',
        email: 'franklin.clinton@premiumdeluxe.com',
        company: 'Premium Deluxe Motorsport',
        position: 'Asset Recovery Specialist',
        description: 'Managed customer collections, vehicle inspections, and resolved billing disputes for a high-volume automotive dealer.',
        gender: 'Male'
    },
    {
        full_name: 'Kratos of Sparta',
        nick_name: 'Ghost',
        email: 'kratos.sparta@midgard.org',
        company: 'Nine Realms Security',
        position: 'Crisis Management Director',
        description: 'Specialized in high-stakes dispute resolution, structural risk mitigation, and youth mentorship programs in hostile terrains.',
        gender: 'Male'
    },
    {
        full_name: 'Aloy of the Nora',
        nick_name: 'Aloy',
        email: 'aloy.nora@elizabethsobeck.net',
        company: 'Gaia Prime Systems',
        position: 'Hardware Field Engineer',
        description: 'Performed hardware diagnostic testing, environmental data analysis, and restored robotic systems to operational compliance.',
        gender: 'Female'
    },
    {
        full_name: 'Nathan Drake',
        nick_name: 'Nate',
        email: 'nathan.drake@sirfrancisdrake.org',
        company: 'Drake Acquisitions',
        position: 'Senior Archaeologist & Recovery Specialist',
        description: 'Conducted international field research, catalogued historical artifacts, and successfully negotiated complex logistical permits.',
        gender: 'Male'
    },
    {
        full_name: 'Joel Miller',
        nick_name: 'Joel',
        email: 'joel.miller@jacksoncountypolice.org',
        company: 'Jackson Settlement Security',
        position: 'Logistics Specialist',
        description: 'Coordinated supply chain distributions, fortified community perimeters, and led emergency rescue patrols.',
        gender: 'Male'
    },
    {
        full_name: 'Ellie Williams',
        nick_name: 'Ellie',
        email: 'ellie.williams@fireflies-seattle.org',
        company: 'Jackson Settlement Security',
        position: 'Junior Security Officer',
        description: 'Conducted perimeter patrols, analyzed localized surveillance data, and maintained emergency response communications.',
        gender: 'Female'
    },
    {
        full_name: 'Jin Sakai',
        nick_name: 'Ghost',
        email: 'jin.sakai@clan-sakai.co.jp',
        company: 'Tsushima Defense Union',
        position: 'Strategic Defense Consultant',
        description: 'Developed asymmetrical defense strategies, trained civilian volunteers, and managed relations between diverse local factions.',
        gender: 'Male'
    },
    {
        full_name: 'Peter Parker',
        nick_name: 'Pete',
        email: 'peter.parker@dailybugle.com',
        company: 'Daily Bugle',
        position: 'Photojournalist',
        description: 'Captured high-profile events, edited digital media, and worked under tight daily publishing deadlines.',
        gender: 'Male'
    },
    {
        full_name: 'Miles Morales',
        nick_name: 'Miles',
        email: 'miles.morales@brooklynvision.edu',
        company: 'Brooklyn Community Outreach',
        position: 'Event Coordinator',
        description: 'Organized community murals, managed youth sports events, and assisted in local crisis response efforts.',
        gender: 'Male'
    },
    {
        full_name: 'Ranni the Witch',
        nick_name: 'Ranni',
        email: 'ranni.witch@carialindell.org',
        company: 'Carian Royal Academy',
        position: 'Dean of Astronomy & Magic',
        description: 'Supervised advanced theoretical research, curated celestial archives, and managed public relations for the lunar house.',
        gender: 'Female'
    },
    {
        full_name: 'Malenia the Severed',
        nick_name: 'Miquella',
        email: 'malenia.blade@haligtree.org',
        company: 'Haligtree Royal Guard',
        position: 'Operations Commander',
        description: 'Led large-scale organizational initiatives, oversaw defense personnel, and designed combat simulation training.',
        gender: 'Female'
    },
    {
        full_name: 'Solaire of Astora',
        nick_name: 'Solly',
        email: 'solaire.astora@sunlightcov.org',
        company: 'Warriors of Sunlight',
        position: 'Community Engagement Lead',
        description: 'Organized cross-regional volunteer cooperatives, promoted optimistic culture, and coordinated relief distribution.',
        gender: 'Male'
    },
    {
        full_name: 'Sekiro Wolf',
        nick_name: 'Sekiro',
        email: 'wolf.sekiro@kuro-heir.co.jp',
        company: 'Ashina Protection Agency',
        position: 'Executive Bodyguard',
        description: 'Provided round-the-clock close protection, performed structural threat assessments, and executed rapid tactical extractions.',
        gender: 'Male'
    },
    {
        full_name: 'Geralt of Rivia',
        nick_name: 'Gary',
        email: 'geralt.rivia@kaermorhen.org',
        company: 'Witchers Cooperative',
        position: 'Environmental Specialist',
        description: 'Conducted ecological hazard surveys, neutralized dangerous invasive species, and resolved disputes between local authorities.',
        gender: 'Male'
    },
    {
        full_name: 'Abby Anderson',
        nick_name: 'Abby',
        email: 'abby.anderson@wlf-seattle.org',
        company: 'Washington Liberation Front',
        position: 'Physical Trainer & Squad Leader',
        description: 'Developed rigorous athletic conditioning curricula, supervised tactical field squads, and analyzed regional patrol reports.',
        gender: 'Female'
    },
    {
        full_name: 'Cole Phelps',
        nick_name: 'Cole',
        email: 'cole.phelps@lapd.gov',
        company: 'Los Angeles Police Department',
        position: 'Detective (Homicide)',
        description: 'Conducted witness interrogations, cross-referenced forensic reports, and prepared comprehensive case filings for trial.',
        gender: 'Male'
    },
    {
        full_name: 'Lara Croft',
        nick_name: 'Lara',
        email: 'lara.croft@croftmanor.co.uk',
        company: 'Croft Historical Research',
        position: 'Principal Investigator',
        description: 'Oversaw field expeditions, translated archaic scripts, and authored peer-reviewed archaeological reports.',
        gender: 'Female'
    },
    {
        full_name: 'Solid Snake',
        nick_name: 'Dave',
        email: 'solid.snake@philanthropy.org',
        company: 'Philanthropy NGO',
        position: 'Field Operations Specialist',
        description: 'Executed stealth infiltrations, gathered intelligence on weapons proliferation, and assisted in tactical extractions.',
        gender: 'Male'
    },
    {
        full_name: 'Leon S. Kennedy',
        nick_name: 'Leon',
        email: 'leon.kennedy@dsg.gov',
        company: 'Division of Security Operations',
        position: 'Federal Special Agent',
        description: 'Coordinated presidential security protocols, investigated international bio-terror networks, and executed high-risk rescue missions.',
        gender: 'Male'
    }
];

export function getRandomDemoCharacter(): DemoCharacter {
    const idx = Math.floor(Math.random() * DEMO_CHARACTERS.length);
    return DEMO_CHARACTERS[idx];
}
