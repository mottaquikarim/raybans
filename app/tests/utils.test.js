// test helpers
const {isPromise} = require('./helpers');

// methods to test
const {getPath} = require('../src/js/github/index');

describe('api path', () => {
    it('should default to mottaquikarim and raybans', () => {
        expect(getPath('','')).toBe('//mottaquikarim/spectacles/');
    })
})
