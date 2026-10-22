import axios from 'axios';

async function test() {
    try {
        const targetId = 'a56653bb-d760-496f-af29-c44bbec6d1cb'; // Christopher John De La Torre's ID (wait, I don't know his exact ID)
        
        // I will just get any ID
        const res1 = await axios.get('http://localhost:5000/api/applications', {
            headers: { 'Authorization': 'Bearer test' } // I don't have a token.
        });
    } catch(e) {
        console.error(e);
    }
}
test();
