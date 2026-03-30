# h sort
# Halluciate the values of each element in the list
# Sort by hallucianted values
# Return the "sorted" list

import random as r

def h_sort(lst: list) -> list :
    mx, mn = max(lst), min(lst)
    halluciations = [r.random() * (mx - mn) + mn for _ in lst] # bound each value by min and max of list
    sorted_lst = [x for _, x in sorted(zip(halluciations, lst))]
    return sorted_lst


