// * New start
// * references:
// *** Node Tools: https://github.com/sindresorhus/awesome-nodejs
// *** JSON LD:  https://json-ld.org/
// ***       --> https://github.com/digitalbazaar/jsonld.js


async function returnTrue() {

  // create a new promise inside of the async function
  let promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve(true), 1000) // resolve
  });

  // wait for the promise to resolve
  let result = await promise;

  // console log the result (true)
  //console.log(result);
}

//returnTrue();

module.exports = {returnTrue}
