const getDcrBucket = (diffGap)=>{
    if(diffGap>0 && diffGap<=100){
        return "bucket0_100";
    }
    else if (diffGap > 100 && diffGap <= 300) {
      return "bucket100_300";
    }
    else if (diffGap > 300) {
      return "bucket300plus";
    }
    else {
      return null;
    }
}

export { getDcrBucket };