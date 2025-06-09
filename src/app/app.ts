import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'simplex-web-calc';

  public fVariables: number = 5;

  public problem: SimplexProblem = new SimplexProblem(this.fVariables);

  constructor(){
    // this.problem.addConstraint(new Constraint([2, 1, -1, 2], 6));
    // this.problem.addConstraint(new Constraint([1, 1, 2, 0], 5));
    // this.problem.addConstraint(new Constraint([-1, 2, 1, 1], 8));
    // this.problem.func.coefficients = [1, 2, 3, 5]; // Example coefficients for the objective function

    this.problem.addConstraint(new Constraint([1, 2, 0, 1, 1], 12));
    this.problem.addConstraint(new Constraint([-1, 2, -2, 4, 0], 13));
    this.problem.addConstraint(new Constraint([1, 1, 1, 1, 0], 7));
    this.problem.func.coefficients = [1, 0, 2, -1, 0]; // Example coefficients for the objective function
  }

  public snapshots: SimplexTableStep[] = [];

  public onVariableCountChange(): void {
    if(isNaN(parseInt(this.fVariables.toString()))) {
      console.error('Invalid input for variable count');
      return;
    }
    this.fVariables = parseInt(this.fVariables.toString());
    if (this.fVariables < 1) {
      return;
    }

    this.problem = new SimplexProblem(this.fVariables);
  }

  public validate(event: any): void {
    const value = parseInt(event);
    
    if (isNaN(value) || value < 1) {
      console.error('Invalid input for variable count');
    } else {
      
    }
  }


  public addEmptyConstraint(): void {
    if (this.problem.func.coefficients.length === 0) {
      console.error('Objective function must have coefficients before adding constraints');
      return;
    }
    const newConstraint = new Constraint(Array(this.fVariables).fill(0), 0);
    this.problem.addConstraint(newConstraint);
  }

  public removeConstraint(index: number): void {
    if (index < 0 || index >= this.problem.constraints.length) {
      console.error('Invalid constraint index');
      return;
    }
    this.problem.constraints.splice(index, 1);
  }

  public solveProblem(): void {
    this.snapshots = this.problem.solve();
  }
}


export class ObjectiveFunction{
  
  coefficients: number[] = [];
  
  constructor(variables : number) {
    if (variables < 1) {
      throw new Error('Degree must be at least 1');
    }
    this.coefficients = Array(variables).fill(0);
  }

  evaluate(variables: number[]): number {
    if (variables.length !== this.coefficients.length) {
      throw new Error('Variables length must match coefficients length');
    }
    return this.coefficients.reduce((sum, coeff, index) => sum + coeff * variables[index], 0);
  }
}

export class Constraint {
  coefficients: number[];
  limit: number;

  constructor(coefficients: number[], limit: number) {
    if (coefficients.length === 0) {
      throw new Error('Coefficients cannot be empty');
    }
    this.coefficients = coefficients;
    this.limit = limit;
  }

  isSatisfied(variables: number[]): boolean {
    if (variables.length !== this.coefficients.length) {
      throw new Error('Variables length must match coefficients length');
    }
    const total = this.coefficients.reduce((sum, coeff, index) => sum + coeff * variables[index], 0);
    return total <= this.limit;
  }
}

export class SimplexProblem {
  func: ObjectiveFunction;
  constraints: Constraint[] = [];

  constructor(varCount: number) {
    this.func = new ObjectiveFunction(varCount);
  }

  addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
  }

  isFeasible(variables: number[]): boolean {
    return this.constraints.every(constraint => constraint.isSatisfied(variables));
  }

  solve(): SimplexTableStep[] {
    this.func.coefficients = this.func.coefficients.map(coef => parseFloat(coef.toString()));
    this.constraints.forEach(constraint => {
      constraint.coefficients = constraint.coefficients.map(coef => parseFloat(coef.toString()));
      constraint.limit = parseFloat(constraint.limit.toString());
    });



    let tableau: number[][] = [];
    let limits: number[] = [];
    let basicVariables: number[] = [];

    basicVariables = Array(this.constraints.length).fill(-1);

    let fRow: number[] = [];
    let fRowDiff: number[] = [];
    const numVariables = this.func.coefficients.length;
    const numConstraints = this.constraints.length;
    if (numConstraints === 0) {
      console.error('No constraints defined');
      return [];
    }
    // Initialize tableau

    tableau = Array(numConstraints).fill(null).map(() => Array(numVariables).fill(0));
    limits = Array(numConstraints).fill(0);
    for (let i = 0; i < numConstraints; i++) {
      limits[i] = this.constraints[i].limit;
      for (let j = 0; j < numVariables; j++) {
        tableau[i][j] = this.constraints[i].coefficients[j];
      }
    }

    for(let col = 0; col < numVariables; col++) {
      let oneFound = -1;
      let ok = true;
      for(let row = 0; row < numConstraints; row++) {
        if(tableau[row][col] == 1) {
          if(oneFound !== -1) {
            ok = false; // More than one 1 in the row
            break;
          }
          oneFound = row;
        }
        else if(tableau[row][col] != 0) {
          ok = false; // Not all zeroes
        }    
      }

      if(ok){
        console.log('Found basic variable at column:', col + 1, 'row:', oneFound + 1);
        if(basicVariables[oneFound] === -1) {
          basicVariables[oneFound] = col; // Assign the row index as the basic variable
        }
      }
    }
    
    
    // calculate the objective function row
    fRow = Array(numVariables + 1).fill(0);
    for (let j = 0; j < numVariables; j++) {
      for(let row = 0; row < numConstraints; row++) {
        if(basicVariables[row] === -1) {
          fRow[j] += 0;
        }
        else{
          fRow[j] += tableau[row][j] * this.func.coefficients[basicVariables[row]];
        }  
      }
    }


    


    fRowDiff = Array(numVariables).fill(0);
    for (let i = 0; i < numVariables; i++) {
      fRowDiff[i] = this.func.coefficients[i] - fRow[i];
    }
    const steps: SimplexTableStep[] = [];
    let step = new SimplexTableStep(tableau, basicVariables, fRow, fRowDiff, limits);
    steps.push(step);
    console.log('Initial tableau:', step);

    let stepC = 0;

    let enteringIndex = -1;
    let leavingIndex = -1;

    try{
      while(true){
        let done = false;
        stepC++;

        if(stepC > 30){
          break;
        }

        let missingBase = false;
        for(let ch = 0; ch < basicVariables.length; ch++) {
          if(basicVariables[ch] == -1) {
            console.log('Missing base variable at index:', ch);
            missingBase = true;
            break;
          }
        }

        if(!missingBase && fRowDiff.every(diff => diff <= 0.009)) {
          console.log('Optimal solution found, no entering variable needed');
          break;
        }

        if(missingBase){
          let firstMissingBase = -1;
          for(let ch = 0; ch < basicVariables.length; ch++) {
            if(basicVariables[ch] === -1) {
              firstMissingBase = ch;
              break;
            }
          }
          let firstAvailableBase = 0;

          for(let b = 0; b < numVariables; b++) {
            let found = false;
            for(let ch = 0; ch < basicVariables.length; ch++) {
              if(basicVariables[ch] === b) {
                found = true;
                break;
              }
            }
            if(!found) {
              firstAvailableBase = b;
              break;
            }
          }


          leavingIndex = firstMissingBase;
          enteringIndex = firstAvailableBase;

        }
        else{
          let minDiff = Number.NEGATIVE_INFINITY;
          for (let i = 0; i < fRowDiff.length; i++) {
            if (fRowDiff[i] > minDiff && fRowDiff[i] > 0) {
              minDiff = fRowDiff[i];
              enteringIndex = i;
            }
          }

          if (enteringIndex === -1) {
            console.log('No entering variable found, checking for non-basic variables');
            done = true;
            for(let ch = 0; ch < basicVariables.length; ch++) {
              if(basicVariables[ch] === -1) {
                done = false; // There are still non-basic variables
                console.log('Non-basic variable found at index:', ch);
                break;
              }
            }

            if(!done){
              console.log(basicVariables);
              for (let i = 0; i < fRowDiff.length; i++) {
                console.log('fRowDiff[' + i + ']:', fRowDiff[i]);
                if (fRowDiff[i] > minDiff && fRowDiff[i] != 0) {
                  minDiff = fRowDiff[i];
                  enteringIndex = i;
                }
              }
            }
          }

          if(done) {
            console.log('Optimal solution found, no entering variable needed');
            break;
          }

          let smallestRatio = Number.POSITIVE_INFINITY;
          
          // Find leaving variable
          for (let i = 0; i < limits.length; i++) {
            if (tableau[i][enteringIndex] != 0) {
              const ratio = limits[i] / tableau[i][enteringIndex];
              let canSwap = true;
              for(let ch = 0; ch < basicVariables.length; ch++) {
                if(basicVariables[ch] == i) {
                  canSwap = false;
                  break;
                }
              }
              if (canSwap && ratio < smallestRatio && ratio >= 0) {
                smallestRatio = ratio;
                leavingIndex = i;
                
              }
            }
          }

          if (leavingIndex === -1) {
            smallestRatio = Number.POSITIVE_INFINITY;
            for (let i = 0; i < limits.length; i++) {
              if (tableau[i][enteringIndex] != 0) {
                const ratio = limits[i] / tableau[i][enteringIndex];
                let canSwap = true;
                for(let ch = 0; ch < basicVariables.length; ch++) {
                  if(basicVariables[ch] == i) {
                    canSwap = false;
                    break;
                  }
                }
                if (canSwap && ratio > smallestRatio && ratio != 0) {
                  smallestRatio = ratio;
                  leavingIndex = i;
                
                }
              }
            }
          }
        }

        // Find entering variable
       
        

        console.log('Entering index:', enteringIndex + 1);
        // Pivot operation
        console.log('Leaving index:', leavingIndex + 1);

        const pivot = tableau[leavingIndex][enteringIndex];
        if (pivot === 0) {
          console.error('Pivot element is zero, cannot proceed');
          break;
        }
        console.log('Pivoting on element:', pivot, 'at row:', leavingIndex, 'column:', enteringIndex);
        for (let j = 0; j < tableau[leavingIndex].length; j++) {
          tableau[leavingIndex][j] /= pivot;
        }
        limits[leavingIndex] /= pivot;
        for (let i = 0; i < tableau.length; i++) {
          if (i !== leavingIndex) {
            const factor = tableau[i][enteringIndex];
            for (let j = 0; j < tableau[i].length; j++) {
              tableau[i][j] -= factor * tableau[leavingIndex][j];
            }
            limits[i] -= factor * limits[leavingIndex];
          }
        }
        // Update basic variables
        basicVariables[leavingIndex] = enteringIndex;
        // Recalculate the objective function row
        fRow = Array(numVariables + 1).fill(0);
        for (let j = 0; j < numVariables; j++) {     
          for(let row = 0; row < numConstraints; row++) {
            if(basicVariables[row] === -1) {
              fRow[j] += 0;
            }
            else{
              fRow[j] += tableau[row][j] * this.func.coefficients[basicVariables[row]];
            }  
          }
          fRow[j] = parseFloat(fRow[j].toFixed(2)); // Round to 2 decimal places
        }

        for(let row = 0; row < tableau.length; row++) {
          if(basicVariables[row] === -1) {
              fRow[numVariables] += 0;
            }
            else{
              fRow[numVariables] += limits[row] * this.func.coefficients[basicVariables[row]];
            }  


        }

        fRow[numVariables] = parseFloat(fRow[numVariables].toFixed(2)); // Round to 2 decimal places


        fRowDiff = Array(numVariables).fill(0);
        for (let i = 0; i < numVariables; i++) {
          fRowDiff[i] = this.func.coefficients[i] - fRow[i];
        }
        step = new SimplexTableStep(tableau, basicVariables, fRow, fRowDiff, limits);

        if(steps.length > 0) {
          steps[steps.length - 1].enteringIndex = enteringIndex; // Store 1-based index
          steps[steps.length - 1].leavingIndex = leavingIndex; // Store 1-based index
        }

        steps.push(step);

        

      
      }
    }
    catch (error) {
      console.error('Error during simplex algorithm execution:', error);
      return steps;
    }

    
    console.log('Results:', steps);
    return steps;
  }
}

export class SimplexTableStep {
  tableau: number[][];
  basicVariables: number[];
  fRow: number[];
  fRowDiff: number[];
  limits: number[] = [];
  enteringIndex: number = -1;
  leavingIndex: number = -1;

  constructor(tableau: number[][], basicVariables: number[], fRow: number[] = [], fRowDiff: number[] = [], limits: number[] = [], enteringIndex: number = -1, leavingIndex: number = -1) {
    this.tableau = Array.from(tableau, row => Array.from(row)); // Deep copy of tableau
    this.basicVariables = Array.from(basicVariables); // Deep copy of basic variables
    this.fRow = Array.from(fRow); // Deep copy of fRow
    this.fRowDiff = Array.from(fRowDiff); // Deep copy of fRowDiff
    this.limits = Array.from(limits); // Deep copy of limits
    this.enteringIndex = enteringIndex;
    this.leavingIndex = leavingIndex;
  }

}
