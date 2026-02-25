const WORKER_BASE = 'https://cipher-squad-worker.jikoentcompany.workers.dev';
const TEST_AUTH = 'mock dev_user_local';

async function test() {
    console.log('[1] Testing Create Squad');
    const createRes = await fetch(`${WORKER_BASE}/api/squad/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': TEST_AUTH },
        body: JSON.stringify({ name: 'Node Test Squad' })
    });

    console.log('Create Response Status:', createRes.status);
    const createText = await createRes.text();
    console.log('Create Response Body:', createText);

    if (createRes.ok) {
        const data = JSON.parse(createText);
        console.log('[2] Testing Join Squad with ID:', data.data.id);
        const joinRes = await fetch(`${WORKER_BASE}/api/squad/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': TEST_AUTH },
            body: JSON.stringify({ squadId: data.data.id })
        });
        console.log('Join Response Status:', joinRes.status);
        console.log('Join Response Body:', await joinRes.text());
    }
}
test();
