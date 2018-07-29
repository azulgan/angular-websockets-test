import { AngularWebsocketFrontendPage } from './app.po';

describe('angular-websocket-frontend App', () => {
  let page: AngularWebsocketFrontendPage;

  beforeEach(() => {
    page = new AngularWebsocketFrontendPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
