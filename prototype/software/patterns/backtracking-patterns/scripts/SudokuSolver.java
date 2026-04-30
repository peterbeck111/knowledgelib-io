/**
 * Sudoku Solver using Backtracking
 * Input:  9x9 board with '.' for empty cells
 * Output: solved board in-place
 *
 * Source: knowledgelib.io -- AI Knowledge Library
 * License: CC BY-SA 4.0
 */
public class SudokuSolver {

    public void solveSudoku(char[][] board) {
        solve(board);
    }

    private boolean solve(char[][] board) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (board[r][c] == '.') {
                    for (char d = '1'; d <= '9'; d++) {
                        if (isValid(board, r, c, d)) {
                            board[r][c] = d;              // choose
                            if (solve(board)) return true; // explore
                            board[r][c] = '.';            // unchoose
                        }
                    }
                    return false; // no valid digit found: trigger backtrack
                }
            }
        }
        return true; // all cells filled successfully
    }

    private boolean isValid(char[][] board, int row, int col, char d) {
        for (int i = 0; i < 9; i++) {
            // Check row
            if (board[row][i] == d) return false;
            // Check column
            if (board[i][col] == d) return false;
            // Check 3x3 box
            int boxRow = 3 * (row / 3) + i / 3;
            int boxCol = 3 * (col / 3) + i % 3;
            if (board[boxRow][boxCol] == d) return false;
        }
        return true;
    }
}
