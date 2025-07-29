import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HoldingsComponent } from './holdings.component';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioData } from '../../models/portfolio.model';

describe('HoldingsComponent', () => {
  let component: HoldingsComponent;
  let fixture: ComponentFixture<HoldingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HoldingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HoldingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
