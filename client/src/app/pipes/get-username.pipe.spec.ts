import { GetUsernamePipe } from './get-username.pipe';

describe('GetUsernamePipe', () => {
  it('create an instance', () => {
    const pipe = new GetUsernamePipe();
    expect(pipe).toBeTruthy();
  });
});
