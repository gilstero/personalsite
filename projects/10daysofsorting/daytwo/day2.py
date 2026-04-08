# valley sort
# find a drop between three consecutive elements in the list ex, -_-
# swap middle element and left element
# scan again until no more drops are found

def valleysort(lst: list) -> list:
    sel = 0 # smallest element
    while sel < len(lst) - 1:
        if lst[sel] > lst[sel + 1]:
            lst[sel], lst[sel + 1] = lst[sel + 1], lst[sel]
            sel = 0
        else:
            sel += 1
    return lst

print(valleysort([5, 3, 1, 2, 4]))

