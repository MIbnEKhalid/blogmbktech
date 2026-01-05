class Shape{
    void draw(){
        System.out.println("Drawing Shape");
    }
}

class Square extends Shape{
    @Override
    void draw(){
        System.out.println("Drawing Square");
    }
}

class Circle extends Square{
    @Override
    void draw(){
        super.draw();
        //System.out.println("Drawing Circle");
    }
}

public class Main {

    public static void main(String[] args) {
        Shape temp = new Circle();
        temp.draw();  // Output: Drawing Circle
    }
}
