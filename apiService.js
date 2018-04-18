const axios = require('axios');
const API_ROOT_URL = 'https://ponychallenge.trustpilot.com/pony-challenge/';
const service = {
    createNewMaze,
    getMazeCurrentState,
    move,
    printMaze,
};

/**
 * 
 * @param {Object} options - options to create a new maze
 * @param {string} options.mazePlayerName - maze player name
 * @param {Number} options.mazeWidth - maze width
 * @param {Number} options.mazeHeight - maze height
 */
async function createNewMaze(options) {
    const URL = API_ROOT_URL + 'maze';
    try {
        const res = await axios.post(URL, {
            'maze-player-name': options.mazePlayerName,
            'maze-width': options.mazeWidth,
            'maze-height': options.mazeWidth,
        });
        return Promise.resolve(res.data);
    } catch (err) {
        return Promise.reject(handleAPIError(err));
    }
}

async function getMazeCurrentState(mazeId) {
    const URL = API_ROOT_URL + `maze/${mazeId}`;
    try {
        const res = await axios.get(URL);
        return Promise.resolve(res.data);
    } catch (err) {
        return Promise.reject(handleAPIError(err));
    }
}

async function move(mazeId, direction) {
    const URL = API_ROOT_URL + `maze/${mazeId}`;
    try {
        const res = await axios.post(URL, { direction });
        return Promise.resolve(res.data);
    } catch (err) {
        return Promise.reject(handleAPIError(err));
    }
}

async function printMaze(mazeId) {
    const URL = API_ROOT_URL + `maze/${mazeId}/print`;
    try {
        const res = await axios.get(URL);
        return Promise.resolve(res.data);
    } catch (err) {
        return Promise.reject(handleAPIError(err));
    }
}


function handleAPIError(error) {
    if (error.response) {
        let errData = error.response.data;
        return errData;
    } else if (error.request) {
        return error.request;
    } else {
        return error.message;
    }

}

module.exports = service;