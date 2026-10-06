(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }
  function T(text) { return typeof window.tr === 'function' ? window.tr(text) : text; }

  /*
   * Il tuo marchio: the coach's (or gym's) name and logo. The coach picks an image, crops it to a square by dragging
   * and zooming, and "powered by Nurvan" is laid over its lower edge; what is drawn here is the icon itself, made in
   * the three sizes a Home-screen icon needs and sent to the server (see server/coach-os/branding.mjs). The icon is
   * the one of the web app a client installs from the coach's link: a store app has one icon for everybody.
   */
  const PREVIEW = 280;
  const SIZES = [512, 192, 180];
  // The Nurvan wordmark (as in the dashboard), inline so the canvas is never tainted (also in the Android app).
  let wordmarkImg = null;
  const WORDMARK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWgAAAA3CAMAAAAWlCBxAAADAFBMVEUAAADd3Nzn5ubX19cEBAPR0NDV1NQBAAACAgEDAwLGxsaop6epqanj4uLNzMyvr6/h4OChoaC2tbVdXFxvbm5oZ2d5eXizsrLl5OTb2trCwcHf3t66urrKycltbGxiYWFra2uRkZF3d3aEg4NfXl6HhoWZmJiura2VlJRlZGTFxMRaWVlzcnK5ubiBgICLiopYV1fZ2dlVVFTOzc2sq6t7enrLysrW1dUGBgWPj49JSEimpaWDgoG0tLRqaWlTUlKko6O8u7u3tra9vLygn591dHRLSkqOjY3Av79/fn5NTEzp6emdnJzIx8dGRkVRUVHT0tJ+fX3S0dGxsLCXlpZnZmZ2dXVkY2PDw8N9fHyenZ1ycXFhYGCamZlxcHCIh4erqqpXVlajoqLPzs6TkpIaGhnt7e0XFxaNjIzo5+cKCAVcW1u/vr45OTgLCgqMi4u+vb2bmpqJiIhPTk6WlZUeHR1QT0/r6uoVFBQ7Ojrw7+8+PT0cGxucm5tEQ0OxsbG4t7cSCgT19fXy8vIrKioRERAzMjJeOwiysbEODQxRMAQhISBvRwr6+vovLi5aOAYlJCQ3NjXs6+sbEghmQQhiPgdVNAbxwja3t7f////BhxpAQD+YZhJ5TQt0SguibBPjqSbrty19UQzxyT6RYRKAVA3uvTLnriiNXhBrQwjgpSTJjhxjQhHYnCC9ghgqKCXpsyqJWg+yeRUJAgCbm5u4fxieahO1exaFVw3RlR6vdhXNkR3doiLGixvUmB6qcxOmcBRUVFLaniGIbi/Wtk06Kg//5mAlIxn0zEYsHAc/NyO1kTv/4FilhDlNQiX91UTBnj+oopLuwkPUqj/NnzbavFb+2k4iFge/r2PFqkx4XCO3trVpVCaxq5sdGhP7yzt8bjiZlYpjTRyWYg2OiHpeTCZiXUt1URRZRh5CPi+blH7kt0Z0b1vouj19eFyCZSvBtXWUdTP/9ndTT0Ljx2SCe2iknIOKgmXt1m+BYRpxYTLRtmJqZFJ7c1Dl2IV5bkQTrqtVAAAACXBIWXMAAAsSAAALEgHS3X78AAAgAElEQVR4nN2cd1RbV7rot5DEUUUS6gjUhRAqSKgjCSTRJEBGgAAhOpLppgjcMBhwBccV23GJS+LYiR2PkzhxmjMppMzNTJJJmd7vlDtzZ+6d2/t976239hFFYGAyf7w/3v1WlrMWh33O3r/z7a/t7wDAOiGAjQVZvoAQEAQABCFs9pv/k4Ww/geQxUaCEAnw4ssvz86+TEQQhAiG6s3ShobSUo2mVMqRlu4FxA3HEQj9//WXqLz//vvv/+V/za6S/x8hyGbE1ggBlNVRKGQypYPSYeroMJns2zfmBXDgW//wQyg/+tGPfvT5jz7FgeETAgHGEAxasXw+vW9hQgVsGw0k4mb/5Z++8Y1vfOOTTz75/vc/++RbL9sIX2Vq/58IQsB9hdUgyHwt32IJZGSEw7mkgAUfnOBuggEHvg1xffL9z37xi19c+MUHNhDCeIpnLnK5XJc2cyRMivLKAG6DgQTC0I++//TTTz994ZlnXnz2uT9+CHD/g0DbgJMCcH9SqQk4myt1JJNbZzKZlHOuGV+WpbsVbPSKEBz49icfobSeevHJ5579zix4LJAayPXMeL0z2sFBUhoeQ92xEWkCcfYDCPrChWeeevHZJz/6Nki8SkKybD3LZEE2/OmWkrScdVf+NEiEuEbWj8CBggMHxBtv5bVrAEeiWSMz3Gkabdo148nICgYPlG80DsGBv/4GChpyfu/J75wF4AgWn6FNd3HTf5LpI1mC/G7+6Q3sDpFw9nvf/wh9Q88+99x7X/7Vy/2PzPf/sSDEzRzPnx665VUimKRTrfQjAPcnV0QA+4wZM9xpbt00d2YkI2BMxR6QbkB6CTTK+ev33v76Bz8AOLA36nNxXS6vNnMw1xg08LsDG1h4FDQ68Nknv/7e21/+FWIjIAiOeHLfmR2o7N2x99AWC0LAoX079u7dt2/f3r179+7rSfhvBBzau2Pv3sQN1gr6e/D39+17AsqZ7UQ4CwQhgKEn9qI/RO+1Y98hZGN/lPTsnqKiTn1nZ36+Xq1W65kn10YPBMR1AMuvDMx/hc2BA7sMxXPT03XTroseX1bUyqefED1qAhAc+KtvfPT0M089Czm/AUEDHNgWHJnxcrkzmZ4MS9CAoZ4IH34kjiGCsx989vQS53tvP/0reHME9PRdOnHg4MGJhd2VlQexezaPRAhg5kQKj47B4o1p+NrKUnRuBBsIX+qemOju7u7eXdnHo2L4BizWauDz+RiMgE7nVXYfPHDgxIkTly5dutRNMu8EUKkRmykFi7Wm1kaDVj41ZaF73yaefxUO5URlZR8Vg7VasVhsquCJNWRwwH8Ci7XiF+wbeqdHbibHal3TSiXX68mw1Br41MoDY48MRHDgp994+sIz0G68/cbdtz/4Jjq0yDpy0eVK9xT7LPhUPrXvUp1tvWMggrPf++wCtBtfv/fGG3e//BXUaALYWTmxO4Uq4GNTg6n86PbNVZoAyIJAIKNY63LVzdFyhYAIn4ADtIMCAcRrDUbTAhkjmdCI0epotDnXzEgGyRI0CKi83d0TkPelSzyNDRARHDiZq3XVKU2mOW1xRiCNdxG3VciA2IC60pfrG9HSlMoOioNBFq/jvO0gPppmiQa7q78KaSJoxLtcXBdXC3FZDQJe98S+9QOXQD/17HPvvf3mW2+9+T0IGuAA0+qqo7kyRzKM+FQ+PaXvUgisiymg6fgMcn7v3ht337r85U9f7oduaGflwUoeHWOwBq1YQXBL0BRqFimjeIbLdbnqSKyEryYC2gEqHJ6KN1ospAxf8QxK0KSkcV0zvlwLHssXQKXtPjjR3cervFQ8CXAABxos6TPpLu70T4ozSMbgAeFWfgwBh43BLNKg1mWC0lES6UmeJhH0WPnGaIBksaRGH9s0X1uzlGasq4427UVB8wW8lIO8Q+s3FQ789JOnL7z4JNTnty6/iWo0/GlhMJ077fJkkIJYPjWlj3dCt+4dQY3+BQzs7r351uXLz/8NBI0QwGTfwcoUOgYbrA2mYqJrVrB+dso+C2lQy6VBjIG2xMRwgHtQwMdag0aLJUDyFafXKSkORpfbQaF00FzeTNSU0am8vt3dCwu7K3mCA5btUAV6POF0rpJG4874AlFsCn2LNwxDNx4pzad1Oboc7ki23aFfp9DKhYCFNOjxBSy8uq8UTROAMzjn4royfSQ8lk/nVaYcDO5cSxra6E+eeebZJ++9cffy88/fXQINiKAhyE2/6AlnBa0GOm93d/eJJRQroJCzH1yAHhQd+BoEDZOp7SkHdqfQMYYgPlrLT9uzpengWUg+7bSJ4qaQc1mJuxOBcgLDT62NWgLhcIYnnUZ2dzEiVSUMt9tNMdG8I4Eolo+hUnmVlQsLlTyqIEpN7yfibEBuVCpNJho302eJWg0Hcjbf8wRwBuPLyCieM7kjD0Kx8ljclhwu4UDziagxtzjd68mNBifMX8V4IAjRXstNT5/xBfAGCHoh5URgrVuDoL+fMByXX3ntpbcSpgNdsRk/MzKYa4mm8gXUyu7u7oPMNc8kEM5+8MwS51dee/g3P0X6Yc2jJ+VgZQpVgA1G06IG45Ya3UHPChe7lBSHg0IuFi+DpkzwsbVGS65v0KNNp1EcXYySqqpIpITR5eigeT3QeAjovL6+lJQUKlVgCKbxnMBGINgixSZThzI900eKWjHUg5v7QyKgRWe0mV4TuSsksZcrHDuSieDAjm5jIKz9icubCbFN7P8TjjWBEdjGjd6RkXBWNJVP5/UtdPedoK1xazBh+ejZ5yCuV156+PDyskbD7ZBnGPFlBOC0U/oqK/sqJ9akiATC/Heeeu69N+ALevjwnb/5FUxYELC9D9poAT8Vb4xiLVuCnqMGfDNzlA6yw+EYFK4BbQmEB4szZ1xKsptREqmqmhqtKnE7TNMubdhSC1Wal9KXQhVg+NbatID1DCAQwJmA1zVtmtP6AtAfHcywbWJccUCO0Q5q000UN6NqvFyW05C8KoQwb6TnZmR6013Qr0axC6lb7Mrk1cy78Zk+FDS1b/fu3ZWCAxE0JFq+sQ18+6Mnn7v35uVXHr7z7rvPw/Bu+ZG4kLUYXRedV1nZtztlN29H0tuFKfiL0IO+8tI719999zuJOBqC7ksR8A1BvNFozdrSdNDoucXeaZOD7HZ3Zayajm4+tjYr7CvWel1zJkdXSUnVaHb2g0gJw9FR59JmZEVTDQI6lcej0umY1GCUNJjVCgiACJwWl4vLvegjpVn5dN6ltZHE6oLBdmOxdmbORHGUTFWF7MORnclzxAHJQjh30EujTV8cCQeiBsyJ0FcxHoAAeuqMPpIlasXQUyor+/r66CeGk0aiGv3ce2+89fxr71x/9dWXPvjBSnSBgCF3MMNYa+XTqbyFhcpKXjf9yCppAmHo8yffePOt51969/qrr17/zrcToKEzhNFxMGo0BrO2dob83GLXNMXdxXC7iwsTdyYASiW2FroibbprTunoqmrNzonFJJKc0UiJQ1k34yNlQY2lUnlocIIPDGbWzRwCOBzYqZ1xpXszfSRjkE+vPEhfAzCJZK/RNEfrcLgZkaoHoXLyQLJpwIH8bu2gR+vicl0zxblZUayAd6JiS+OxvHEIYKcWH7ZErQIqtW9hobIvBXOAlUQaB7795Xtv3L0MOV+58s6Pzq6mpwRwuCNIwqOmYzc0iYKJ1MdWHgpBf/3Nty6/9u6rV65c+TUEDZ3hZCK8wwaNaZZoYGvQhoyROqWDwSgpYYwkQCM4kHmCJ8AG8VFLIDdhwd0lkQiD4TYpaS6Pj2SE0WZlpYDKowswWHyA5EvvSNejwbQ8i5uuHczNqsViqH2Vl8Y30kQi2JeqnK7rcHeVVIVCozmtOUPJJROwE5OlveitU9Zxoemw4LEY+gHsVsYDWblGBC9kBQO1WD61r3KhD+LiTzBXw0wc+P2X0BG+8+qVmzdvv/v5WcDqX048CaBnrjYraBCk7N69u49Kp2IqfXuWXyFCGPr8HtwIr165efvmr7/7LcQGHzrZdzCFJzAE8ZasgJG0JWgTdkSrpHQ9iExVVc2wlzU6P66r4ZRKORqWUMhulMvlciYT/tsiEqkKWRppjUzmz5vZ3UeH9ikt7EmvI9cp4HqR/q6w15MB1RBD5S1MnCjYQBMRG1fbYSKXRCKR0ZzsKQltnSekWbkXaSYKxTTnmin2JRzUxq9sSbaLV25ABEcs0TQsRsCr3L3Qx6PTBZiFVbeGA7//45tvvfLw+pXb9+/ff/XzsyCYs6q1YOdIMGoQUPv6Kvt4dIGAv3tuaPnGhKGP30Q533791uv3P/8WzDhgeHewj4fB1hoDJJIlY0vQlKDWZXIzph6MVo1qC7+SJVwhMhbEGPipFkv4Iq3DwWidR+AN95IuZvpyLcZUGCZNXIr2P1J0IgKxhUGhMKqqGFNVkdYccs1aw8GiUmgmitvtMNW5tMVhC3xnCxMnyjYzHgiYp+qAbekxRLAvGq3F0Kl9fX2wfIAx8Okrbg0HvvWdt55/eP3Kzddv3bj168/nQfEl3UpFlQgOZRmwAtTJ83gCPjbY5+hPwEMIQx/ffQ2+IDjwFgoajaMP8qgCLN4SyM0l+bbW6GBmHcU91ToaCoW4S+EdLL8SiQT43ybFUSIB/gYo4GFTo5Zw2FPnKIlEJuFziEBhuTgIzSSGWtl9cOJSon6y5pmnsxxutzuU/WD0QaSqtVWJDlx5C2cESgoZ5keUjmlvpi83C3VtCyeihzddx7zxUvPKY4hgGxam4Cl9lSk8HlVgSOXXnl4qaxPBt77z/MN3X715/8bVqzd+/fE88C0cSB66w4rBUHmV8BUJoOlNyUaW6s5DH19+5/qV27euXr169cbHL8BgBoKe4FExqdGs3LAvw7OFdUOAKZpeR2aMjsdisRhtBfRXEgSHUOh4C8l3kWtitEqmTsPnEMDkoK/YR0pLxQh4CwcnDiygP04SHJDMtEZasyWSnOySkki2i5n8VGQoo5hREhkNTTHcFKW3eCRsqYVFqu7uS5tWl5B5fPeB+iRcerpBwOvb3cdDQQezsBnbE1eJ4Fvffe3dKzfv37h2/Nq125/2g5EJQVKtAAf28fmClITp4KfWGnMFClThCcjQx6/BjXDj2vHj165C0GjwlDLBo/ODxkCur3hQu2V41xFNV1Ii2TG7RCIxqf4s0AAHpAJSeOQiraPkQcg+ehIdjQMDpLrMcBb0/H3dExOXKGv5EEABKTRVNd5rL5dkVzGqHFPJCTYODEdbS1pzymOhqRKHqU47gpoOesrCxMTBbZuQRobSujETA0mWuJHHF8C0A0ZF2GA016CdR40tEfz+u+9cv3L/1tXjd+4cv/+pDfgO0OkHVt0lDlSk8HiJgXxrNIs0wpeihykE2z8+vHLz9us3jp87f+fOxy/A2yFgMqU7YTl8Po9Hu3VmaOEqKVWx8mG73W6q/3NBs7DF2hku2T2ak2MvWaonI7gqD3cQTQ15MJld5w8JQ7SumCQ2HB/Ok8SyS0Zn9iV5QiKoCJbnSHrj7cP28VaGY/qix5ebBtOPhYnug8ZNVIZgC0zQ6QfzV3ARAWcBDaRhOoXFp1l8BgaaIkKNfufK7ddvXLtz/vy5W5/aQBY0st2rFVUcEB1I4fHoVAGfn2oMhH0evipRez777jtwJ5w7f/78+U9XQdP51qiF5CvOzPRuARoBHQEaxR2yD+eVD8cphX8uaIllxqVUOiJVMXt89GTiOQSwI8wdgSGggM5LSaFO5A6t9XUX4+UKmSKuUJTHqkbr/MkJBeixtCoUfp1T0SvJaY2Qu2iZg7mWWgOdVzmxQD2Yt0n+M2ScoNLpuyuWLyMIMnyAipYH+AYr3hgIu6LlADocHO5Xr92+DzkfPX/+6qc2EJyg0vkG3v4k0oUH6TwqFcPHBi2kDI/WlVYNsRDBhw9vXz1+7ujRo+fOffoXCdA7UxboqIn2ZV7Ubg2aQlI6qsbzFO3xeNyxAhqBDSLIZrLkEW3gBetIep3JzRgdl0ji9uXkhAB0Fk+iPkOn0gWYE22rgSwCTmt74wqd0+lsj9tjoSnTWk9Y5dLJmjhNOsWwPZYTouzT+LS5WUEDrMryqILKgo1II+CwYYJKx1oxTyw/CAG4nIN0aKH52GBaIDzoqQs6YWCCIOB3129cvQN5nb/6jyhoAR/Lx+xNIq05QIW23RpNyx2c4XZQ0vYBG+wB+fD2nXPnjp46dfT8p38BZ42ASV4lnZ+aRgoXz3i96VuCJmc4GCFJr0Ihkym6/iyNRsBhj8FVR3aXZEvy4u0yxeFlXMikdnCElBbE8gUwjqUKHluZAQ6EGH6Zs6mmRqZQxCWxufw1eVtLFqeGI5VyzDWKeF5eSTPYyYVhRxBrwNAFdAwvd6PIAwF7DAt0gSGIpa/gQgDOfYAONRobteT6imfSadi2hAnA3Xj9zh3I69RxFDQdwzfgg9iTSXa6HG32SK3NyvW4pk1kbgbqfgjgw/vnzp96/PHHj72/BHonr1KArbWEwyNa7zR3i7IwAshhcqS1XOGUyWTOqqWEBYDDk5M7H9u5c3L79u2T2ycnJyd3Tu5ckccSclKVhsnkmhjZ4+XDMp1fUbNyiIoDzLTMsKUWFq3pfIO1O7a8fiIo05bW1HAazE01zvZhSVfrcviL7oQXjHF/U0Nzm6bBLJMpJLEeHFDnzmQE8FY+RoDh82sFNRuodAI0vBxMPbJ8nQDmtQcEGFgqhnXg9LoOR2AxQbr/1g2U16nz79tAsBseJQWzUtNW8m0CEYkcNGAM1mhW2DNDIzu6HK7HYB8HETx+9fFjx44lg+6DliPDV+x1meq2BO3wOSLjcZnT7/fXhJacIRFwJwSou7ZkpVkCpHCx1utNd7nStbCYhh738FL6eLyAi2tyj46XO/1NnIbypJAFsZWQEqcD0Hfj8SlPLF1D5il5Zqm0obTBXOOM2+3cM0ngCMQ6R5NZIy4sFGo4Nbr2qjOAiNhig4MBPNaA4fOxwWgguEHPFgL2YLrhC03LMOJXDlUIoCfczcdgoQX1eLkmcldJ7n6AQwhEcPbWuVOPHzv2+FEIegHW7Y2kwazBnasmvl85YcDWppF8mdwONyMyblKi59YIePzOscfXghZYo1kZxRfnaCba1qCLGa3lCp2/ydzEiTWisyQQQTGvNkoa8bq4yg4yIyTJa5c5/U1NTTpFfDinxEGb8eWmGUmZM3MUd2usXCFrkjaIh8+sRg9EsCONlIa3YjEYPj+IT+MP9qNhPw4IGRppQ3NbQ6lUWiNTODhrDAcnkyVlFdbXs4VtpVJp3gBaPNkRzsyFVshgsOIt4Vzy0CMNNQjowVQK+Fa8hTSYG17pyiCAxywpWEOqkeTTcpVkdyTbnYuaFgI4e+0UVMxTf48DwUq6IVhrIYUzs9JhZQP6IHQ78KLRQDhDW0fpKhkN2clfDKEVBtzRo2s1OkVgNeb6PC6uyWHa8szQ4SkJ5TmbzBwpR7oEGiGAn2CMltxiLk1J7prKtuflKWR+TgOHY3Yq8iRVJe6O6RlfbobHS3NHQuUKv5lT2lZak3xAiAO9wXBaqoGPwWBro8YAD/WHBHBorkHKEgrFzRqpWSeLM5LiNQLYl8VpaGOLWlpUKra4ucl/GMFBF+QnDcIyMR9rjQZ8rnByMW5ZAXv4fbAGFgj70jN8KyeMRHDSyo/Cje3hdjgYD0I5DO0LMP0ggm8ePwZJ/xgHgn0YAxo2jMxlcLfDNBBNBMEkiW8MjHi80+TIVHasvF35SyJ6rf/c0WOnHl8BTaXya7PCgxdppg63aeNS5ZIykLWRnHadmdNQWtrcK1o2HVq6keTzwpPCqnH7eHm7zM9pZrGaG5r8sjx7qMqtdGmLubRph/uBJO40l7JYjfGC5MIQAZwmBVA8BmstNEBBuHwiMm5v1rSJ2ezCNo20qYmxmGRtkMPaYU2zuFGuZspb6lkaO7QqRHik7yEFokEDPCoOjHjJriPrj2oR0MNP4WNr0eiC68tcWS8O7DPgLbkerXfOxKhqzbH3lvzs5wm39s2vHXv88VMQNA8G2gFfsVZbZw2tzIcITkaNgyNertIdac0pb8+TKf81YTxmzx099fjf/3wJNF2AjaI7poPCIG8J2uGdiin80tLSNo0wT74Cmg8diMndVRWSTOllvdJSllBcKBSypDXOPMmom6LkuuoojKlQTtzZxGlj1bM0a7rDoJHAWFKtBgMWG7RYcouDMWDrB/lkFauQ3djYyBazpOY8Z1IPEg7YaRoOS8RU65kiFVuoUAG4hWEQKTJClTZYU9NIPheF0rreeEDQPL4VNkYUa73KQGTlTeDAIsaSASMHiEvSW67I/rf5BKIPj586dRQFjUmNWnKLtVqvK0OSbP32RjMyvdMd7qpQLE+h0Pl/9rcABxAiOHv81LFl0JMCTNDiK+YqTSbHlHtrjfaGymVmTXMzq1kYX/JnRJBuJfku0ihd2Tm9itDJw86mNlZhvaqeLW7WcGT27Kkuk0lJYcRi9jyFWcppEIt1yeEweufDXiw+FWuwBvGW3IxiD6YM2A67pUKVSiQXNbLFGmlD7FDyuqpJwtI2NnNggAmrsWL/HmCz2X47j+vvH+pKI0HQtcbACFfJSF8fhKKgMUFLVtijnUnnZj5YnQoOiLAj8IzfHQlJYPzeNPUHG1oSAx8eP4ZqNNVgNVpyR7x1NFNxbE2SusuqdTkYVdkhSVyma+I0/Oy30JcSwA+OJ0DDwj8WawwMZnIpFHJX6E+A5oaGdZy25jZWm1i2Yjq8WFKGN1EDaQ+dATudZrGYrVKxhaxmqXM4FHFQOhxdU+OxXpmT06Zp5ihOr9/POLANEzRYrdZomiXXl6kNc+dBg10lZquYA0y5qlAodrasWlsEbPfphEK2SA5Ji9hs5xlAtIHf/tN/glkb2BuMBoNWK94SGJyp66iiresdg6DphmAWyefxcrm04siaFIgT9LrI7q6pkD2ucPqb/D/7zVIL27E7x35sA7WC1FoY/7mUJpMnGTRMEaMdZHd2aLy83dlkbmjW/OyfE770m9f+EWaGsEwahaceMzRKFyMyvjXorunxXh2HJRaKhfX+pRMlAvAaAr4ZJZkxGor1th4BYDuntFDMhra1zazozWmNuMnuyHjM3tvulwrZZum6/gl0noRRXtQajEYtuRkeLo0cVh2i1ReyRQN6vZopqmc3K5I8IQ48IDdrhCom7MGTq+rNbEAkgp3/57OPPny5f4hQTq214mtrLaQMLZdcxYjZ1nZrgB4sPwgdGtqNo2UkrRdBkF5LB9ldNZrTC0FzpJov/jYRW4HHr/3YBqL8YFogI/PidAeF4kkyHehLkmZ2uVtDOeWKGo60VFNa+gUajRLBN2EKDsOTHmNtwKflUhyR0exYaM9mmAFMwbnj7eZmMZtdzxZx1MvFxPTUcHE6zdGVHZO0h44AG+gxS9mF9exCloaja+/NeRBxM0LlcYXObzbrzAX9G7QSEcFpPDYYTCOR0M4QCiXd3SBqYeo7O/VqJpPN1u1fHYQD8txSqVA0wGQOQIUXcXoI/bMv/8MnX372+ezsbP9pS7DWioe1m5/UdXTl0Nb2LyJIj9WAtwTgcyhuhytZo2FM3Dtd4q4aDfW2y5qkpSyW8IvfojVOAu7o+0QQNRgt4eKLdSaKg+EtX6MvCII4XaMhuz2uM5e2scTi+tIvXoDJOAF8eDZB73AYG/BMm9wlVSFJb85qAvyozGeYcmQNQpVIJBK1SHcl1k4ELmvYlz6tdE9JymU5Z4ANB/awxI2FELTU324fbx2tGu2VhMrbdRxhRc/Gn4zYgIZnTLOQfIPauQ53ZIpcwmwZUHcu5neq1QPyQvZqdZQATlvaS4Uqpl4N1Z3JNO8FttmX//afnn76mc9+TJidJ4ip0WA0EMgdnJkzuVtjtDU1bqjRWKMlI9OFnhjQqtasFwFD2dwqFFcNp5lVWFgo/tk/o2UP0P/XNpBmDeQWe9JhS0W2y76usQkM5ZB7y9t1NQ2sQnZ9Y32h7oufJ2KPxHWCTZnqK+aaukZDMXs8O7kOuVYI4BCeMa6QCtkiJlM+wFo6uyMCV+3giMtE7oqM5ymqYBsMARxmtdWLxSxNA8evKJeEskOSgiM7zhzqQaOlDW9OPJxpSAuQRtK5JkdJa8weMQ+o8xd3VRfld+r1zUmscIjJUVrKZuo7F6vz1Uwmh0W09b/8wn9cuPDMMxe+/HB2dr7HJQhGszIGi7VcSkl271T7mrMCsB0tS2inYafPlHItaBgTUxjDeQpnDadUWAg9jfRnv0e3BIRtiYZ9Wi+N4mYwWmnrQMPssqo1rtCZG9qgi2psbNH9AY1a0C+z0CJY0ONSOkpCsfI8RayJsFmpyAak+JLRdo6Q3TKgZjKbl5I7IvhJFNo7RqQ11iuLoPkzAewpFdYLhZpSTpMibg/Fyu0a9Jnr+y5XBQeqBQHYNdJBZmSjFW919dhYxVh1fmdR/a5kA92WUdrAZnbmL1YvdqrlKt0ksX926Ie/eOqpF5968Rcfz549O18mCEZJvsx0rokcGe91MpIPEBGwHW/M9c1wleRISWSqYx1oaMS67HGYC2jE7HqVSNQi/iJxQoIAYLEMar1cSlekqirbZF+vMwTwGCNPpuOUasT1IhGT2dLym39P9D6hj8ABWZp3uoORHbPntSucoWpA3Kgtn2ADR+hed0zXLKxvYQ4M6DVL7pwIXFlabR0MISW9/lCiUEEAezSlYrGwucGsU5Tb47Km3t7JDb8UWSVNjKR6vEoKI9IqicucOpm4YKxsbKyiKL+IvVqGI4IjWZy2+hZ15yI0KyKRbi/A9YO/++TFp1588tmnnvrsx7Nn9wyVUwOkQRdsjMi2x3X+7MmkXAdM4gPFWtccpWs0Eml1jK43lUSwwzQs03EamlnsRrh35W3/hhaUAQAkkifdZXJHsmM5EnfvBucyibwAAA1dSURBVA3oRxhOs4YlFNfLRUx9p1r9m79bfTIMTFw0clVOebtM1+T3M9SPlAcQAswoj6QGHIyYs1kokuv1+vy2yRXQAa/X5OjKzpEM60aXGt8g6TZRobhZ6pfF82Q1Zmn58PYtG2px4EjaiItS0ppjh3lNg1mnLyurKKuormYnNxjY5iQsoQoq9OJi/oCco0JsNnDyP1589tknn3vy2Rcv/PGbs2fnT1uiGZlcijsymjOs0JmHNWtAR0keLo3SNRWKhXK6HgENY023v6ZUwxKzGxvler1aX/qHpfbHQCDTpYQ2VlJe7i5/dDlEsD9iLmXVq0QDan1+fqda/sv/lXQ6ud/CNTFC5XkKJ4wLGiKSgp39tn4bDh4yEHGoDO3ZF+s2pHdEemtKxSL0Cwfh0PJ4VxZsQphqldjj/pJtS2sigD1tQnabRlrj1ymcTaVCdqlug7huzQIb0iju0Zh9WFbDaShtNjfvL9hWUFGkbkmuJTWls9pUTH1nUVG+Xi1vlB4Gttmhf7jw3HPv3bt37+tPPnnh09mzPx9q5M9Aa/ggWxLXmaXC8tW+RwRMBknF3I6q7FDMLokxWh91/kSQ7/BLm9mqxpYWubozX6/W/caG/lo4w6XsILfa7b157Yy14d3y0OqYkC0SMfX5+dXV1dVq5i/RcBr9fhb00GiOSKg8Ly6r4ZRqNKx2spJCoZAdFNqcV+sZGfTlZhn5ExNRn7djtNevYbfo8zuL5Myl50CNTqc5SkYfxOzD/sgyaFiP5HDaNKUcna7GrGGJ61vEsse2agVBwLypjhGy57U7zQ0sMZut0T+xray6un41vyGCJyxmqbhenV9UtJifr5b7T6KG46O333vjzbt3775x77knL/xq9uzheXKaS8nIlgy3+zkaobA0tnKegYDJtEyuyeHOjsUkvcPZoQ2iLCJozBGLRaJGuVrfubhY1Kmv+Ve4p4FPSyE7Itm98bw8ReQRG53Qr0W/XNTChFuuoqxsLL/xi4QvTbT7arsisTyYOWrahCwNi1Xqj5fHQhFKXbrHZ8Fj6ZW7eXwjKdPUFer1awpb1Pn6XQ1PLINGuD4ahdEays6JxzmhFdDQC+vMsFEJBqTs+sZGEWv4ka76tesry4xkl7fLaqDfFslVwrGKsTFm2cqCEGTe1yptK5Tr86urdxWp9dIB0N8PzvzL3bfuXr78/PPPX7779r1nv/uD2bP9+2pd5KlYu7OGo2EVFqqcGvQmqF5tz6B1UNwl2fby3jxZaHyjcJYAGv2NMP/X5+fvqqgYqy6Ko4nLiKvDHZFIehXtcVlrfMO1EIBc2iKSq/MXqyvKygp2qcV/WLbwBHBS62gdTiQ0bUJ2YaFQWMji6OL2WHakwzUStuBTscEgPqBVloR6nZp6plqvzzfPL+NB6jwmR0loPBSLO6WxpOZkAuhpKmVrpFKNmK1qFDHl+sZ4ostgEyEQhin2dqeZoxGqRHL1gEpetquCmewJJemcJk0jyrlaLVcJhwj9s/P/cO+VV157Ccorz7/15psvvv/y2bP9uvBULC7zmxtYhSpRizoOzwASG3h7MayDxmLDsvb4JqARxNbMEalaIK9dFRUVZbs6fwkTFy2ta3R8fLhdIXPWhPI2XAoC+oXNTLV+cayirGBbQVlFdeNvlr9fw4G2Oju0o5rmNiEMHesLC8Uas65dEsp207S5RnwwWBsNhD11XaFhZwMEXWFe0VwiQvN0dLXm2GN5Mn9zbFWjUdI1DSxOKatQ1cJU6zs7i5iKpO7WDbThkKNXViPVsNgq+YBaP1DIHBOtekIiGMPXNJWK5frF6uqi/JZGzmmA60f+/Y8PX4J9ta9ef/fhS6+8cvnuix/Onp39udItifvNnGaxqkXOVLe0L70vqNFcU8loLA4PPmXjsQ0TNAQcNre1yNX66rGKgm3bthWM5f9yGwAuclXM3ouefEgl8Y19OwIOc1T5+sVdZejAsrEiFmdJKREwb29V+JsaWOLC+kaRSCVqVLFZUrOsN1TFMLl8afhgMGgM+DLnyA/sMrNQJM9XsVbyOyKivOiuyrGXD+fJnA3jyaABAWxv10G7wdTDuHdXdZHevtWHbjigqtLVSJthTgTdtlqVr086E++xjOqaNGymPr+oqJMplxbA3t8z//LSQ9i1efv2lSvXr7/78JXn7308e3YWjGnL435ps7hexBwYUC+Wspc/i9yeSe7Ktg8nDuQk9k26P0BPDdw5S7gKysbUv9wBuF2tkl5ojxoaNOXtm+VeYNIMjdsy6ep8/7KyEMBjIYmuBhJRtchbRI0tLSqxsKEpPh7pcswVB6KpqfCgLLPOMSVR1DTXyxs5qzUeIkJLd4/mQIun8Des0Wj0ofEmMVvO7Fysrh6rGCtaHAg98p1ZsjbsGVc0aVDOnUXVi/n6ttWPrHAgonXqpCwRE2p0vprNHsLZ+od+ePn69Zv3X7916/X7t2/evPLquy+99t6vXp7tB+UMWVMpiy2SD3TqO/VjskTcj4Dt3pJWyXC708/hcBri5ZuUHAjgtBnOOoFrW1nZmEgH6qpyeuMys1Ta1sZSyDaLVgngBbM+f1dZQRnkXFHdWbpycEcAp4fzOM2F0P4n2m5b2GJWU3usyk2heUhpQWvQSPLNzJkcobjTLG7WJX1jRkBMytEce1wG691t9nUfkBDApJ8ll6vzq6FvqNiVn6/O2YI0EZSNN7DYjTAMXSzK7yxc7c0gAj0+ntdUWihndhZVFxUtCk8D2yz439+9ffP+ravXrl27evXGrdfv37xy/d2X7v5gdhY5RHNy2gpVLQP6/KLqXRV6MxqPImA7F55r6sxSaXNzs2x4s9oOEZysUXdWjxUUbNu/raCgYExdCpRVsbhMx9FohKy2zUHDxEVaVA3f0P79BWUVu9pWT0ihustYbHZjY0uLCG1sZgtL/cPjJRRaejEpWmtNjVpIma46R3avrkEmTU49CIjD1BqzDytkCmcTS7L+Sx0i2G4uVKv1RRB02S6YzUU2aoNeFluNk8WGcWjRYvVYEROecqKCgJ3RqbiCI1SJBjqLFvN3ifYBoo2w43u/vv361WuwOe44bCi8cev+zZs3X/lPwuwQEE21tbEb5QOdRbvGKiq2saoTJZ7t3GxJIlMWsjTO+KZFNCJ4oqloEZrogm3bKiqq9VLgHpfpaszNQqFYKHTqNs+/iOAJVllZwbb9+/dvK6goECcdRRPAUKe/mS1SNYoaRRC0sK1BZx+PkKe9IwFLNBisNZJG0mmO8Xi5ZGBl9SgBxE0O2XtlOr9OZ34UNHyHUlGnvnqsrKAM7iN1S5t24z9zkfjtIxIWu2UAWpqxAubqsQoOOMLD7f4GFrtFDUWuthFxuPkfPnz91tXj587Bpq3z58/dgaxfv3//8ocv99uGes1slUrO7IRGa6yiwglLUwjoUbaWt+uaSlniQrGwBnbEbzqXCs3YGFRo1NQuSkFJTNEk1QjFhWy2SmpO/rLokaEF4rIKaHO2VRSNic8kF1sQ8JhcI4bJvahRpSpklXJk9laGoy4zHEiLpgajlkBGOq2jw6Q4ubbQSUBKGDlQRZxOfw0rKQdbfej2ZjnkDHdRvlrOZjV5KlZawR+doqpJ1aLOr961q2JxLImzCjMa05k1wvoW+EEBU7wT4Gzg775749a143fOHz0Fe1xOnT937vjxazdu3bj56sv9NrAjm12IBsPVFWUFBQVMIUKAXs40HodpTCGbXSjmtG9RFiaAfHEFGnVsK6vOz5eC0XYzpxkGZo2NTJZ0q0gVAZ31qEJvK9hVtFzoXCGNPLarEIZWosb6Qpa0RlYeYlDqtOEAPoiFZ3CkgGWk/Anb2gocQgChKUmezG82N5k54rwNPvIjgEn2YsESaL2c3VAjMa4ifGSGkwoVcwAmsGPylXyOAA5ZS+xQncSNIjlTna/aAWw2sOO/X79x9fid87DD5djjp07BTrdzEPad638NrzcoVI1yJgRdULCtoKBhP7ARkT2Rdj9MVeHxRWPb5pYW/asXchG0zxUFFbsWF9uAOyJRyMwsoZhVqpH5t/4WGqdWqeHZRKdezVl/nIYAMHR6XwVUOg2nqcZpD7nr0rWeQZIFXxvNncuWju2EWcV6Mgxla055Xp7dntcuzVnttEwm3dMoH2AymfIWkUooVYx3KfnLGfwjQgS7ZGJxfQuzU4TWxtG/lESwafElo/a8uBMGoeJCcQUBRqX/ffnXt28cTzQhnj8K/z137jj0izdef+UHcCuNS9sKRQP51WMVFWVlRQPt0LnsoUjanToOi62qZ4tYm9voRDG/Xl4AnUtZxS69FBw6cuTkyUOHXnjhhUMnTx7aCjMcevLIySNHjhw5dHJ9d/1ytZgwdBjKnj092ycfe+w0Ki8cOt0DI9qN/sjEoX1nEnLkyMkjG3YlE0DPtoL9UAoqdsFqkFouXM4sH5X5ioKyirJt255YKltBGdoL5wxXCeWFQ/NwJj//3bnf/e5rX/va0aNfg3J06f+o/O5DgCOCfQ1ilhCmho0qdiFb1QTrBkMsaGZV0ACJRIXCP4HrcH2zsF4kqi8s5FT8X8+iz4lvkNdQAAAAAElFTkSuQmCC';;
  function wordmark() {
    if (!wordmarkImg && typeof Image === 'function') {
      wordmarkImg = new Image();
      wordmarkImg.onload = function () { try { paintPreview(); } catch (_) {} };
      wordmarkImg.src = WORDMARK_SRC;
    }
    return wordmarkImg;
  }
  // The band "powered by" takes the lower fifth of the icon: the logo is drawn above it, never under it.
  const BAND = 0.2;
  const state = { img: null, zoom: 1, ox: 0, oy: 0, name: '', saved: { name: '', hasLogo: false }, busy: false };

  // Draws the icon at `size`: the picture in the square above, the band "powered by" + Nurvan wordmark below.
  function drawIcon(canvas, size) {
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const band = Math.round(size * BAND);
    const area = size - band;
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, size, size);
    const img = state.img;
    if (img) {
      const k = size / PREVIEW;
      const scale = (PREVIEW * (1 - BAND) / Math.min(img.naturalWidth, img.naturalHeight)) * state.zoom * k;
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, size, area); ctx.clip();
      ctx.drawImage(img, (size - w) / 2 + state.ox * k, (area - h) / 2 + state.oy * k, w, h);
      ctx.restore();
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, area, size, band);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, area, size, Math.max(1, Math.round(size / 256)));
    const wm = wordmark();
    const wmH = band * 0.4;
    const wmW = wm && wm.naturalWidth ? wmH * wm.naturalWidth / wm.naturalHeight : 0;
    let px = Math.round(band * 0.3);
    ctx.font = '700 ' + px + 'px -apple-system, "Helvetica Neue", Arial, sans-serif';
    const gap = band * 0.12;
    let label = ctx.measureText('powered by').width;
    while (label + gap + wmW > size * 0.9 && px > 5) {
      px -= 1;
      ctx.font = '700 ' + px + 'px -apple-system, "Helvetica Neue", Arial, sans-serif';
      label = ctx.measureText('powered by').width;
    }
    const total = label + gap + wmW;
    const x0 = (size - total) / 2, cy = area + band / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9c9c9';
    ctx.fillText('powered by', x0, cy);
    if (wmW) ctx.drawImage(wm, x0 + label + gap, cy - wmH / 2, wmW, wmH);
  }

  function clampOffsets() {
    const img = state.img;
    if (!img) return;
    const area = PREVIEW * (1 - BAND);
    const scale = (area / Math.min(img.naturalWidth, img.naturalHeight)) * state.zoom;
    const maxX = Math.max(0, (img.naturalWidth * scale - PREVIEW) / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - area) / 2);
    state.ox = Math.max(-maxX, Math.min(maxX, state.ox));
    state.oy = Math.max(-maxY, Math.min(maxY, state.oy));
  }
  function paintPreview() {
    const c = document.getElementById('brand-canvas');
    if (c) drawIcon(c, PREVIEW);
    const mini = document.getElementById('brand-mini');
    if (mini) drawIcon(mini, 96);
    const nm = document.getElementById('brand-mini-name');
    if (nm) nm.textContent = (state.name || '').trim() || 'Nurvan';
  }

  function iconDataUrls() {
    const out = {};
    SIZES.forEach(function (size) {
      const c = document.createElement('canvas');
      drawIcon(c, size);
      out[size] = c.toDataURL('image/png');
    });
    return out;
  }

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type || '')) { say('Scegli un’immagine (PNG o JPG).'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      state.img = img; state.zoom = 1; state.ox = 0; state.oy = 0;
      say('');
      const z = document.getElementById('brand-zoom');
      if (z) z.value = '1';
      paintPreview();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { say('Scegli un’immagine (PNG o JPG).'); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function say(message) {
    const el = document.getElementById('brand-msg');
    if (el) el.textContent = message ? T(message) : '';
  }

  function render(container) {
    const field = 'width:100%;margin-top:4px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:16px;box-sizing:border-box;';
    container.innerHTML =
      '<div class="coach-os-page" id="coach-brand-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Coach')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Il tuo marchio')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('Nome e logo che vedono i tuoi clienti. Il link che mandi apre una web app con il tuo marchio e “powered by Nurvan”: l’icona che il cliente mette sulla Home è la tua.')) + '</p></div></div>' +
      '<div class="coach-os-card" style="padding:14px;">' +
      '<label style="font-size:10px;color:#ccc;font-weight:800;display:block;">' + escText(T('Nome (palestra o coach)')) +
      '<input id="brand-name" type="text" maxlength="40" placeholder="Fitness Gym X" value="' + escText(state.name) + '" style="' + field + '"></label>' +
      '<div style="font-size:10px;color:#ccc;font-weight:800;margin-top:14px;">' + escText(T('Logo')) + '</div>' +
      '<input id="brand-file" type="file" accept="image/*" style="display:none;">' +
      '<button type="button" class="btn btn-outline" style="width:100%;margin-top:6px;" onclick="document.getElementById(\'brand-file\').click()">' + escText(T('SCEGLI IL LOGO')) + '</button>' +
      (state.saved.hasLogo && !state.img ? '<p class="coach-os-subtitle" style="margin:8px 0 0;">' + escText(T('Hai già un logo salvato. Sceglierne un altro lo sostituisce.')) + '</p>' : '') +
      '<div id="brand-crop" style="display:' + (state.img ? 'block' : 'none') + ';margin-top:12px;text-align:center;">' +
      '<canvas id="brand-canvas" width="' + PREVIEW + '" height="' + PREVIEW + '" style="width:' + PREVIEW + 'px;height:' + PREVIEW + 'px;max-width:100%;border-radius:22%;border:1px solid #333;touch-action:none;cursor:grab;"></canvas>' +
      '<div style="font-size:11px;color:#aaa;margin-top:6px;">' + escText(T('Trascina per spostare, usa il cursore per ingrandire. Il logo sta sopra la fascia “powered by Nurvan”, che non lo copre.')) + '</div>' +
      '<div style="font-size:10px;color:#ccc;font-weight:800;margin-top:14px;">' + escText(T('Anteprima nell’app del cliente')) + '</div>' +
      '<div style="display:flex;align-items:center;gap:12px;justify-content:center;margin-top:6px;padding:10px;background:#000;border:1px solid #333;border-radius:12px;">' +
      '<canvas id="brand-mini" width="96" height="96" style="width:48px;height:48px;border-radius:22%;"></canvas>' +
      '<span id="brand-mini-name" style="font-weight:900;letter-spacing:2px;color:#d4af37;font-size:15px;"></span></div>' +
      '<input id="brand-zoom" type="range" min="1" max="4" step="0.02" value="' + state.zoom + '" aria-label="Zoom" style="width:80%;margin-top:8px;"></div>' +
      '<div id="brand-msg" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:10px;"></div>' +
      '<div style="display:grid;gap:8px;margin-top:6px;">' +
      '<button type="button" class="btn btn-primary" id="brand-save">' + escText(T('SALVA IL MARCHIO')) + '</button>' +
      ((state.saved.hasLogo || state.saved.name) ? '<button type="button" class="btn btn-outline" id="brand-remove" style="color:#c66;border-color:#c66;">' + escText(T('TOGLI IL MARCHIO')) + '</button>' : '') +
      '</div></div>' +
      '<p class="coach-os-subtitle" style="margin-top:12px;">' + escText(T('Nell’app degli store l’icona resta quella di Nurvan, uguale per tutti: il tuo logo compare in alto dentro l’app dei tuoi clienti e come icona della web app che aggiungono alla Home. Chi l’ha già aggiunta deve toglierla e aggiungerla di nuovo per vedere la nuova icona.')) + '</p>' +
      '</div>';
    const file = document.getElementById('brand-file');
    if (file) file.onchange = function () { loadFile(file.files && file.files[0]); };
    const name = document.getElementById('brand-name');
    if (name) name.oninput = function () { state.name = name.value; };
    const zoom = document.getElementById('brand-zoom');
    if (zoom) zoom.oninput = function () { state.zoom = Number(zoom.value) || 1; clampOffsets(); paintPreview(); };
    const canvas = document.getElementById('brand-canvas');
    if (canvas) {
      let drag = null;
      canvas.onpointerdown = function (ev) { drag = { x: ev.clientX, y: ev.clientY, ox: state.ox, oy: state.oy }; try { canvas.setPointerCapture(ev.pointerId); } catch (_) {} canvas.style.cursor = 'grabbing'; };
      canvas.onpointermove = function (ev) {
        if (!drag) return;
        const k = PREVIEW / canvas.getBoundingClientRect().width;
        state.ox = drag.ox + (ev.clientX - drag.x) * k;
        state.oy = drag.oy + (ev.clientY - drag.y) * k;
        clampOffsets(); paintPreview();
      };
      const end = function () { drag = null; canvas.style.cursor = 'grab'; };
      canvas.onpointerup = end; canvas.onpointercancel = end;
      paintPreview();
    }
    const save = document.getElementById('brand-save');
    if (save) save.onclick = CoachOS.saveBrand;
    const remove = document.getElementById('brand-remove');
    if (remove) remove.onclick = CoachOS.removeBrand;
  }

  CoachOS.saveBrand = async function () {
    if (state.busy) return;
    const nameEl = document.getElementById('brand-name');
    const name = nameEl ? String(nameEl.value || '').trim() : state.name;
    if (!name && !state.img) { say('Scrivi il nome o scegli il logo.'); return; }
    state.busy = true;
    const btn = document.getElementById('brand-save');
    if (btn) btn.disabled = true;
    try {
      const body = { name: name };
      if (state.img) body.icons = iconDataUrls();
      const data = await window.practiceFetch('/api/coach/branding', { method: 'PUT', headers: window.practiceHeaders(true), body: JSON.stringify(body) }, 40000);
      state.saved = { name: (data.branding && data.branding.name) || name, hasLogo: !!(data.branding && data.branding.hasLogo) };
      state.name = state.saved.name;
      state.img = null;
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Marchio salvato'), 'success');
      const page = document.getElementById('coach-brand-page');
      if (page && page.parentNode) render(page.parentNode);
    } catch (error) {
      say((error && error.message) || 'Il marchio non è stato salvato. Riprova.');
      if (btn) btn.disabled = false;
    }
    state.busy = false;
  };

  CoachOS.removeBrand = async function () {
    if (!window.confirm(T('Togliere il marchio? I clienti rivedranno quello di Nurvan.'))) return;
    try {
      await window.practiceFetch('/api/coach/branding', { method: 'DELETE', headers: window.practiceHeaders(false) });
      state.saved = { name: '', hasLogo: false }; state.name = ''; state.img = null;
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Marchio tolto'), 'success');
      const page = document.getElementById('coach-brand-page');
      if (page && page.parentNode) render(page.parentNode);
    } catch (error) {
      say((error && error.message) || 'Il marchio non è stato tolto. Riprova.');
    }
  };

  CoachOS.views.coachBrand = async function (container) {
    // Branding belongs to the Coach Pro plan (web/features.json).
    if (typeof planCan === 'function' && !planCan('branding')) {
      container.innerHTML = '<div class="coach-os-page">' + planLockedHtml('branding') + '</div>';
      return;
    }
    container.innerHTML = '<div class="coach-os-skeleton">' + escText(T('Carico…')) + '</div>';
    try {
      const data = await window.practiceFetch('/api/coach/branding', { headers: window.practiceHeaders(false) });
      const b = (data && data.branding) || {};
      state.saved = { name: b.name || '', hasLogo: !!b.hasLogo };
      if (!state.name) state.name = state.saved.name;
    } catch (_) {}
    if (typeof currentView === 'undefined' || currentView === 'coachBrand') render(container);
  };

  CoachOS.brandTestHooks = { drawIcon: drawIcon, state: state, SIZES: SIZES };
})();
