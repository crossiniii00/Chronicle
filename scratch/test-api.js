import http from 'http';

http.get('http://localhost:5000/api/applications', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const apps = JSON.parse(data);
            const rey = apps.find(a => (a.applicant_name || '').toLowerCase().includes('dimpas'));
            if (rey) {
                console.log('Found Rey Mark Dimpas in API response!');
                console.log(JSON.stringify(rey, null, 2));
            } else {
                console.log('NOT FOUND in API response!');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', err => {
    console.error('Request failed:', err);
});
