exports.handler = async (event, context, callback) => {
    // TODO implement

    console.log('handler called');
    console.log(JSON.stringify(event));
    console.log(context);
    console.log(callback);
    
        const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};
