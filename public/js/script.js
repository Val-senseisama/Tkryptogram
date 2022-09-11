// document.getElementById("copyButton").addEventListener("click", copyFunction);

// function copyFunction(){
//     var copyText = document.getElementById("walletAddress");
//   copyText.select();
//   copyText.setSelectionRange(0, 99999); /* For mobile devices */
//   navigator.clipboard.writeText(copyText.value);
//       };

      
      const withdrawal = document.querySelector("#amountToWithdraw");
      withdrawal.addEventListener("input", updateValue)
       function updateValue(){
       let fee = withdrawal.innerHTML/ 10;
       let gain = withdrawal.innerHTML - fee;
       document.getElementById("fee").innerHTML = fee;
       document.getElementById("gains").innerHTML = gain;
     };
  
