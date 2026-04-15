const dateDescending = (a: any, b: any) => {
  const now = new Date().getTime();
  const dateA = a ? Date.parse(a) : now;
  const dateB = b ? Date.parse(b) : now;
  return (isNaN(dateB) ? now : dateB) - (isNaN(dateA) ? now : dateA);
};

export default {
  dateDescending: (fieldName: string) => (arr: Array<any>) =>
    arr.sort((a: any, b: any) => dateDescending(a[fieldName], b[fieldName]))
};
