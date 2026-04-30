// Input:  slice to sort
// Output: sorted in-place
// sort.Slice = IntroSort variant (unstable)
// sort.SliceStable = MergeSort variant (stable)

package main

import (
    "fmt"
    "sort"
)

func main() {
    // Basic sort (IntroSort: quicksort + heapsort + insertion sort)
    nums := []int{5, 2, 8, 1, 9}
    sort.Ints(nums) // [1, 2, 5, 8, 9]

    // Custom comparator
    sort.Slice(nums, func(i, j int) bool {
        return nums[i] > nums[j] // descending
    })

    // Stable sort (preserves order of equal elements)
    type Student struct {
        Name  string
        Grade int
    }
    students := []Student{{"Alice", 85}, {"Bob", 92}, {"Charlie", 85}}
    sort.SliceStable(students, func(i, j int) bool {
        return students[i].Grade > students[j].Grade
    })
    fmt.Println(students) // [{Bob 92} {Alice 85} {Charlie 85}]
}
