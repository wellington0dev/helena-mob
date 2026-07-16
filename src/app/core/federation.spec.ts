import { TestBed } from '@angular/core/testing';

import { Federation } from './federation';

describe('Federation', () => {
  let service: Federation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Federation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
