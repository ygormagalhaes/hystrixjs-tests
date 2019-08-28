import express from 'express';
import { commandFactory } from 'hystrixjs';

var hystrixSSEStream = require('hystrixjs').hystrixSSEStream;
function hystrixStreamResponse(request: any, response: any) {
    response.append('Content-Type', 'text/event-stream;charset=UTF-8');
    response.append('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    response.append('Pragma', 'no-cache');
    return hystrixSSEStream.toObservable().subscribe(
        function onNext(sseData: any) {
            response.write('data: ' + sseData + '\n\n');
        },
        function onError(error: any) {
            console.log(error);
        },
        function onComplete() {
            return response.end();
        }
    );
};

const app = express();

const sampleData = {
    data: {
        name: 'John Doe'
    }
};

function getData(): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Date.now() % 2 === 0) {
                resolve(sampleData);
            } else {
                reject(new Error('Wrong time to send the request ;)'));
            }
        }, 800);
    });
}

const service = commandFactory.getOrCreate('DataService')
    .circuitBreakerSleepWindowInMilliseconds(10000)
    .circuitBreakerErrorThresholdPercentage(50)
    .timeout(1000)
    .run(getData)
    .build();

app.get('/', (req, res) => {
    service.execute()
        .then(
            data => res.json(data),
            err => res.json({
                error: err.message
            }));
});

app.get('/hystrix', hystrixStreamResponse);

app.listen(8080, () => {
    console.log('Express application started!');
});
